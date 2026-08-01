const { createServer } = require('node:http');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT || 3001);
const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });

const rooms = new Map();

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
    players: [...room.players.values()].map(({ userId, displayName, isReadyOnStack, billPercent }) => ({ userId, displayName, isReadyOnStack, billPercent })),
  };
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
    // Keep an empty room while clients move from the lobby into the bill screen.
    if (room.players.size > 0) broadcastRoomState(roomCode);
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
    rooms.set(roomCode, { hostUserId: userId, players: new Map(), stackVerified: false, sessionStarted: false });
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
    io.to(roomCode).emit('SESSION_STARTED');
    broadcastRoomState(roomCode);
    acknowledge({ ok: true });
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
