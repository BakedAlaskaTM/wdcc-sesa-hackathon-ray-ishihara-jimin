require('dotenv').config();
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const Stripe = require('stripe');

const PORT = Number(process.env.PORT || 3001);
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const merchantAccountId = process.env.STRIPE_MERCHANT_ACCOUNT_ID?.trim();
const connectedMerchantAccountId = merchantAccountId && !merchantAccountId.includes('replace_me') ? merchantAccountId : undefined;
const httpServer = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (!['/payments/checkout', '/payments/intent', '/payments/status', '/session/summary', '/session/meal-total', '/session/payment-confirm'].includes(url.pathname)) return;

  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') return response.writeHead(204).end();
  if (!stripe) {
    response.writeHead(503, { 'Content-Type': 'application/json' });
    return response.end(JSON.stringify({ error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to .env and restart the server.' }));
  }

  try {
    if (url.pathname === '/session/summary') {
      if (request.method !== 'GET') return response.writeHead(405).end();
      const summary = summaryState(url.searchParams.get('roomCode'));
      if (!summary) throw new Error('Session summary is unavailable.');
      response.writeHead(200, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify(summary));
    }
    if (url.pathname === '/payments/status') {
      if (request.method !== 'GET') return response.writeHead(405).end();
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) throw new Error('A Checkout session ID is required.');
      const session = await stripe.checkout.sessions.retrieve(sessionId, connectedMerchantAccountId ? { stripeAccount: connectedMerchantAccountId } : undefined);
      response.writeHead(200, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify({ paymentStatus: session.payment_status }));
    }

    if (request.method !== 'POST') return response.writeHead(405).end();
    let body = '';
    for await (const chunk of request) body += chunk;
    const { amountCents, payerName, payerId, roomCode, userId } = JSON.parse(body || '{}');
    if (url.pathname === '/session/meal-total') {
      const room = rooms.get(String(roomCode));
      const total = Math.round(Number(amountCents));
      if (!room?.sessionEnded) throw new Error('Session summary is unavailable.');
      if (room.hostUserId !== userId) throw new Error('Only the lobby creator can change the meal total.');
      if (hasPaidPlayer(room)) throw new Error('The meal total is locked after a payment is made.');
      if (!Number.isSafeInteger(total) || total < 50) throw new Error('Enter a valid meal total of at least $0.50.');
      room.mealTotalCents = total;
      response.writeHead(200, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify(summaryState(roomCode)));
    }
    if (url.pathname === '/session/payment-confirm') {
      const room = rooms.get(String(roomCode));
      const payment = room?.payments.get(payerId);
      if (!room || !payment) throw new Error('Payment is unavailable.');
      const intent = await stripe.paymentIntents.retrieve(payment.paymentIntentId, connectedMerchantAccountId ? { stripeAccount: connectedMerchantAccountId } : undefined);
      if (intent.status !== 'succeeded') throw new Error('Stripe has not confirmed this payment yet.');
      payment.status = 'paid';
      response.writeHead(200, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify(summaryState(roomCode)));
    }

    const amount = Math.round(Number(amountCents));
    if (!Number.isSafeInteger(amount) || amount < 50) throw new Error('Enter a valid payment amount of at least $0.50.');

    if (url.pathname === '/payments/intent') {
      if (!process.env.STRIPE_PUBLISHABLE_KEY) throw new Error('Stripe PaymentSheet needs STRIPE_PUBLISHABLE_KEY in .env.');
      const room = rooms.get(String(roomCode));
      const finalPlayer = room?.finalPlayers?.find((player) => player.userId === payerId);
      if (!room?.sessionEnded || !finalPlayer || !room.mealTotalCents) throw new Error('The host must submit the shared meal total before payment.');
      const shareAmount = Math.round(room.mealTotalCents * finalPlayer.billPercent / 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: shareAmount,
        currency: process.env.STRIPE_CURRENCY || 'nzd',
        automatic_payment_methods: { enabled: true },
        description: `Phone Time meal share — ${String(payerName || 'Diner').slice(0, 48)}`,
        metadata: { roomCode: String(roomCode), payerName: String(payerName || 'Diner'), payerId: String(payerId) },
      }, connectedMerchantAccountId ? { stripeAccount: connectedMerchantAccountId } : undefined);
      room.payments.set(payerId, { paymentIntentId: paymentIntent.id, status: 'pending' });
      response.writeHead(200, { 'Content-Type': 'application/json' });
      return response.end(JSON.stringify({ clientSecret: paymentIntent.client_secret, publishableKey: process.env.STRIPE_PUBLISHABLE_KEY }));
    }


    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: process.env.STRIPE_CURRENCY || 'nzd',
          product_data: { name: `Phone Time meal share — ${String(payerName || 'Diner').slice(0, 48)}` },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      metadata: { roomCode: String(roomCode || 'demo'), payerName: String(payerName || 'Diner') },
      success_url: process.env.STRIPE_SUCCESS_URL || 'https://example.com/payment-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: process.env.STRIPE_CANCEL_URL || 'https://example.com/payment-cancelled',
    }, connectedMerchantAccountId ? { stripeAccount: connectedMerchantAccountId } : undefined);

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ checkoutUrl: session.url, sessionId: session.id }));
  } catch (error) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Could not create a checkout session.' }));
  }
});
const io = new Server(httpServer, { cors: { origin: '*' } });

const rooms = new Map();

function hasPaidPlayer(room) {
  return [...room.payments.values()].some((payment) => payment.status === 'paid');
}

function summaryState(roomCode) {
  const room = rooms.get(String(roomCode));
  if (!room?.sessionEnded || !room.finalPlayers) return null;
  return {
    hostUserId: room.hostUserId,
    mealTotalCents: room.mealTotalCents,
    paidUserIds: [...room.payments.entries()].filter(([, payment]) => payment.status === 'paid').map(([userId]) => userId),
  };
}

function makeRoomCode() {
  let code;
  do code = String(Math.floor(1000 + Math.random() * 9000));
  while (rooms.has(code));
  return code;
}

function roomState(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  return {
    roomCode,
    hostUserId: room.hostUserId,
    stackVerified: room.stackVerified,
    sessionStarted: room.sessionStarted,
    sessionEnded: room.sessionEnded,
    finalPlayers: room.finalPlayers,
    finalActivityTimeline: room.finalActivityTimeline,
    finalTimelineRange: room.finalTimelineRange,
    players: [...room.players.values()].map(({ userId, displayName, isReadyOnStack, billPercent }) => ({ userId, displayName, isReadyOnStack, billPercent })),
  };
}

function buildActivityTimeline(room) {
  const durationSeconds = Math.max(1, Math.ceil((Date.now() - room.sessionStartedAt) / 1000));
  return Array.from({ length: durationSeconds }, (_, second) => room.activityBySecond.get(second)?.size ?? 0);
}

function rebalanceBill(room) {
  const players = [...room.players.values()];
  const equalShare = players.length ? 100 / players.length : 0;
  players.forEach((player) => { player.billPercent = equalShare; });
}

function broadcastRoomState(roomCode) {
  const state = roomState(roomCode);
  if (state) io.to(roomCode).emit('PLAYER_LIST_UPDATED', state);
}

function removePlayer(socket) {
  const { roomCode, userId } = socket.data;
  const room = rooms.get(roomCode);
  if (room?.players.get(userId)?.socketId === socket.id) {
    room.players.delete(userId);
    rebalanceBill(room);
    // The lobby creator remains the leader through short disconnects/rejoins,
    // so they do not lose the ability to start the session.
    // Preserve a started room while clients move into the bill screen, but
    // discard an abandoned pre-game lobby when a user presses Back.
    if (room.players.size === 0 && !room.sessionStarted) rooms.delete(roomCode);
    else if (room.players.size > 0) broadcastRoomState(roomCode);
  }
  if (roomCode) socket.leave(roomCode);
  socket.data.roomCode = undefined;
  socket.data.userId = undefined;
}

function cleanDisplayName(displayName) {
  const name = String(displayName || '').trim().slice(0, 24);
  return name || 'Player';
}

function addPlayer(socket, roomCode, userId, displayName) {
  const existingRoom = rooms.get(roomCode);
  const existingPlayer = existingRoom?.players.get(userId);
  // The host first creates a room, then submits their name. Treat that second
  // join as an in-place profile update so host ownership is never disturbed.
  if (existingPlayer?.socketId === socket.id) {
    if (displayName) existingPlayer.displayName = cleanDisplayName(displayName);
    socket.join(roomCode);
    broadcastRoomState(roomCode);
    return;
  }
  removePlayer(socket);
  const room = rooms.get(roomCode);
  room.players.set(userId, { userId, displayName: cleanDisplayName(displayName), socketId: socket.id, isReadyOnStack: false, billPercent: 0 });
  rebalanceBill(room);
  socket.join(roomCode);
  socket.data.roomCode = roomCode;
  socket.data.userId = userId;
  broadcastRoomState(roomCode);
}

function allPlayersReady(room) {
  return room.players.size > 0 && [...room.players.values()].every((player) => player.isReadyOnStack);
}

io.on('connection', (socket) => {
  socket.on('CREATE_ROOM', ({ userId, displayName }, acknowledge = () => {}) => {
    if (!userId) return acknowledge({ ok: false, error: 'userId is required.' });
    const roomCode = makeRoomCode();
    rooms.set(roomCode, { hostUserId: userId, players: new Map(), stackVerified: false, sessionStarted: false, sessionEnded: false, finalPlayers: null, finalActivityTimeline: null, finalTimelineRange: null, sessionStartedAt: null, activityBySecond: new Map(), mealTotalCents: null, payments: new Map() });
    addPlayer(socket, roomCode, userId, displayName);
    acknowledge({ ok: true, ...roomState(roomCode) });
  });

  socket.on('JOIN_ROOM', ({ roomCode, userId, displayName }, acknowledge = () => {}) => {
    const code = String(roomCode || '').trim();
    if (!userId || !rooms.has(code)) return acknowledge({ ok: false, error: 'Room not found.' });
    addPlayer(socket, code, userId, displayName);
    acknowledge({ ok: true, ...roomState(code) });
  });

  socket.on('UPDATE_DISPLAY_NAME', ({ roomCode, userId, displayName }, acknowledge = () => {}) => {
    const room = rooms.get(roomCode);
    const player = room?.players.get(userId);
    if (!room || !player || player.socketId !== socket.id) return acknowledge({ ok: false, error: 'You are not a player in this room.' });
    player.displayName = cleanDisplayName(displayName);
    broadcastRoomState(roomCode);
    acknowledge({ ok: true, ...roomState(roomCode) });
  });

  socket.on('START_SESSION', ({ roomCode, userId }, acknowledge = () => {}) => {
    const room = rooms.get(roomCode);
    const player = room?.players.get(userId);
    if (!room || !player || player.socketId !== socket.id) return acknowledge({ ok: false, error: 'You are not a player in this room.' });
    if (room.hostUserId !== userId) return acknowledge({ ok: false, error: 'Only the host can start the session.' });
    room.sessionStarted = true;
    room.sessionEnded = false;
    room.finalPlayers = null;
    room.finalActivityTimeline = null;
    room.finalTimelineRange = null;
    room.sessionStartedAt = Date.now();
    room.activityBySecond = new Map();
    room.mealTotalCents = null;
    room.payments = new Map();
    io.to(roomCode).emit('SESSION_STARTED');
    broadcastRoomState(roomCode);
    acknowledge({ ok: true });
  });

  socket.on('END_SESSION', ({ roomCode, userId }, acknowledge = () => {}) => {
    const room = rooms.get(roomCode);
    const player = room?.players.get(userId);
    if (!room || !player || player.socketId !== socket.id) return acknowledge({ ok: false, error: 'You are not a player in this room.' });
    if (room.hostUserId !== userId) return acknowledge({ ok: false, error: 'Only the host can end the session.' });
    room.sessionEnded = true;
    room.finalPlayers = [...room.players.values()].map(({ userId: id, displayName, billPercent }) => ({ userId: id, displayName, billPercent }));
    room.finalActivityTimeline = buildActivityTimeline(room);
    room.finalTimelineRange = { startedAt: room.sessionStartedAt ?? Date.now(), endedAt: Date.now() };
    io.to(roomCode).emit('SESSION_ENDED', { players: room.finalPlayers, activityTimeline: room.finalActivityTimeline, timelineRange: room.finalTimelineRange });
    broadcastRoomState(roomCode);
    acknowledge({ ok: true, players: room.finalPlayers });
  });

  socket.on('UPDATE_STATUS', ({ roomCode, userId, isReadyOnStack }, acknowledge = () => {}) => {
    const room = rooms.get(roomCode);
    const player = room?.players.get(userId);
    if (!room || !player || player.socketId !== socket.id) {
      return acknowledge({ ok: false, error: 'You are not a player in this room.' });
    }
    player.isReadyOnStack = Boolean(isReadyOnStack);
    if (!player.isReadyOnStack) room.stackVerified = false;
    broadcastRoomState(roomCode);
    const allReady = allPlayersReady(room);
    if (allReady) io.to(roomCode).emit('ALL_STACKED_READY');
    acknowledge({ ok: true, allReady });
  });

  socket.on('SHOCKWAVE_DETECTED', ({ roomCode, userId, timestamp }, acknowledge = () => {}) => {
    const room = rooms.get(roomCode);
    const player = room?.players.get(userId);
    if (!room || !player || player.socketId !== socket.id || !allPlayersReady(room)) {
      return acknowledge({ ok: false, error: 'All players must be ready before verification.' });
    }
    room.stackVerified = true;
    io.to(roomCode).emit('STACK_VERIFIED', { userId, timestamp });
    broadcastRoomState(roomCode);
    acknowledge({ ok: true });
  });

  socket.on('PHONE_USAGE_TICK', ({ roomCode, userId }, acknowledge = () => {}) => {
    const room = rooms.get(roomCode);
    const activePlayer = room?.players.get(userId);
    if (!room || !activePlayer || activePlayer.socketId !== socket.id) {
      return acknowledge({ ok: false, error: 'You are not a player in this room.' });
    }
    if (room.sessionEnded) return acknowledge({ ok: false, error: 'This session has ended.' });
    if (room.sessionStartedAt) {
      const second = Math.max(0, Math.floor((Date.now() - room.sessionStartedAt) / 1000));
      const activePlayers = room.activityBySecond.get(second) ?? new Set();
      activePlayers.add(userId);
      room.activityBySecond.set(second, activePlayers);
    }
    const others = [...room.players.values()].filter((player) => player.userId !== userId);
    const available = Math.max(0, 100 - activePlayer.billPercent);
    const gain = Math.min(1, available);
    const othersTotal = others.reduce((total, player) => total + player.billPercent, 0);
    activePlayer.billPercent += gain;
    if (othersTotal > 0) {
      others.forEach((player) => { player.billPercent -= gain * (player.billPercent / othersTotal); });
    }
    broadcastRoomState(roomCode);
    acknowledge({ ok: true });
  });

  socket.on('LEAVE_ROOM', () => removePlayer(socket));
  socket.on('disconnect', () => removePlayer(socket));
});

httpServer.listen(PORT, () => console.log(`Stack lobby server listening on http://localhost:${PORT}`));
