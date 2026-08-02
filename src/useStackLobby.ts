import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export type StackPlayer = { userId: string; displayName: string; isReadyOnStack: boolean; isUsingPhone: boolean; billPercent: number };
export type FinalBillPlayer = Pick<StackPlayer, 'userId' | 'displayName' | 'billPercent'>;
export type TimelineRange = { startedAt: number; endedAt: number };
type RoomState = { roomCode: string; lobbyName: string; hostUserId: string; players: StackPlayer[]; stackVerified: boolean; sessionStarted: boolean; sessionEnded: boolean; finalPlayers: FinalBillPlayer[] | null; finalActivityTimeline: number[] | null; finalTimelineRange: TimelineRange | null };
type LobbyResponse = { ok: true; error?: never } | { ok: false; error: string };
type RoomResponse = LobbyResponse & Partial<RoomState>;

export function useStackLobby(serverUrl: string, userId?: string, initialRoomCode?: string, initialDisplayName?: string) {
  const generatedUserId = useRef(`player-${Math.random().toString(36).slice(2, 10)}`);
  const activeUserId = userId ?? generatedUserId.current;
  const socketRef = useRef<Socket | null>(null);
  const roomCodeRef = useRef<string | null>(initialRoomCode ?? null);
  const displayNameRef = useRef<string | undefined>(initialDisplayName);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [lobbyName, setLobbyName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [playersArray, setPlayersArray] = useState<StackPlayer[]>([]);
  const [isAllReady, setIsAllReady] = useState(false);
  const [isStackVerified, setIsStackVerified] = useState(false);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const [finalPlayers, setFinalPlayers] = useState<FinalBillPlayer[]>([]);
  const [finalActivityTimeline, setFinalActivityTimeline] = useState<number[]>([]);
  const [finalTimelineRange, setFinalTimelineRange] = useState<TimelineRange | null>(null);

  const applyRoomState = useCallback((state: RoomState) => {
    roomCodeRef.current = state.roomCode;
    setRoomCode(state.roomCode);
    setLobbyName(state.lobbyName ?? 'Untitled lobby');
    setIsHost(state.hostUserId === activeUserId);
    setPlayersArray(state.players);
    setIsAllReady(state.players.length > 0 && state.players.every((player) => player.isReadyOnStack));
    setIsStackVerified(state.stackVerified);
    setIsSessionStarted(Boolean(state.sessionStarted));
    setIsSessionEnded(Boolean(state.sessionEnded));
    setFinalPlayers(state.finalPlayers ?? []);
    setFinalActivityTimeline(state.finalActivityTimeline ?? []);
    setFinalTimelineRange(state.finalTimelineRange ?? null);
  }, [activeUserId]);

  useEffect(() => {
    const socket = io(serverUrl);
    socketRef.current = socket;
    socket.on('PLAYER_LIST_UPDATED', applyRoomState);
    socket.on('ALL_STACKED_READY', () => setIsAllReady(true));
    socket.on('STACK_VERIFIED', () => setIsStackVerified(true));
    socket.on('SESSION_STARTED', () => setIsSessionStarted(true));
    socket.on('SESSION_ENDED', ({ players, activityTimeline, timelineRange }: { players: FinalBillPlayer[]; activityTimeline?: number[]; timelineRange?: TimelineRange }) => {
      setFinalPlayers(players);
      setFinalActivityTimeline(activityTimeline ?? []);
      setFinalTimelineRange(timelineRange ?? null);
      setIsSessionEnded(true);
    });
    // Socket.IO can reconnect after a device briefly loses Wi-Fi. Rejoin the
    // same room so every phone receives the shared player list again.
    const rejoinRoom = () => {
      const savedRoomCode = roomCodeRef.current ?? initialRoomCode;
      if (!savedRoomCode) return;
      socket.timeout(5_000).emit('JOIN_ROOM', { roomCode: savedRoomCode, userId: activeUserId, displayName: displayNameRef.current }, (_error: Error | null, response: RoomResponse) => {
        if (response?.ok && response.roomCode) applyRoomState(response as RoomState);
      });
    };
    socket.on('connect', rejoinRoom);
    return () => {
      socket.off('connect', rejoinRoom);
      socket.emit('LEAVE_ROOM');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeUserId, applyRoomState, initialRoomCode, serverUrl]);

  const emitWithAck = useCallback(async <T,>(event: string, payload: object): Promise<T> => {
    const socket = socketRef.current;
    if (!socket) throw new Error('Lobby connection is not available.');
    if (!socket.connected) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error(`Could not reach the lobby server at ${serverUrl}. Run "npm run server" and use "npm run start:lan" for phones.`));
        }, 5_000);
        const onConnect = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error(`Could not connect to the lobby server at ${serverUrl}.`)); };
        const cleanup = () => {
          clearTimeout(timeout);
          socket.off('connect', onConnect);
          socket.off('connect_error', onError);
        };
        socket.once('connect', onConnect);
        socket.once('connect_error', onError);
        socket.connect();
      });
    }
    return new Promise((resolve, reject) => {
      socket.timeout(5_000).emit(event, payload, (error: Error | null, response: T) => {
        if (error) reject(new Error(`Timed out waiting for ${event}.`));
        else resolve(response);
      });
    });
  }, [serverUrl]);

  const createRoom = useCallback(async (displayName?: string, newLobbyName?: string) => {
    const response = await emitWithAck<RoomResponse>('CREATE_ROOM', { userId: activeUserId, displayName, lobbyName: newLobbyName });
    if (!response.ok || !response.roomCode) throw new Error(response.error ?? 'Could not create room.');
    applyRoomState(response as RoomState);
    return response.roomCode;
  }, [activeUserId, applyRoomState, emitWithAck]);

  const joinRoom = useCallback(async (code: string, displayName?: string) => {
    displayNameRef.current = displayName;
    const response = await emitWithAck<RoomResponse>('JOIN_ROOM', { roomCode: code, userId: activeUserId, displayName });
    if (!response.ok || !response.roomCode) throw new Error(response.error ?? 'Could not join room.');
    applyRoomState(response as RoomState);
  }, [activeUserId, applyRoomState, emitWithAck]);

  const updateReadyState = useCallback(async (isReadyOnStack: boolean) => {
    if (!roomCode) throw new Error('Join a room before updating readiness.');
    const response = await emitWithAck<LobbyResponse>('UPDATE_STATUS', {
      roomCode, userId: activeUserId, isReadyOnStack,
    });
    if (!response.ok) throw new Error(response.error);
  }, [activeUserId, emitWithAck, roomCode]);

  const sendShockwaveTimestamp = useCallback(async (timestamp = Date.now()) => {
    if (!roomCode) throw new Error('Join a room before sending a shockwave.');
    const response = await emitWithAck<LobbyResponse>('SHOCKWAVE_DETECTED', {
      roomCode, userId: activeUserId, timestamp,
    });
    if (!response.ok) throw new Error(response.error);
  }, [activeUserId, emitWithAck, roomCode]);

  const reportPhoneUse = useCallback(async (isUsingPhone: boolean) => {
    if (!roomCode) throw new Error('Join a room before reporting phone use.');
    const response = await emitWithAck<LobbyResponse>('PHONE_USAGE_TICK', { roomCode, userId: activeUserId, isUsingPhone });
    if (!response.ok) throw new Error(response.error);
  }, [activeUserId, emitWithAck, roomCode]);

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!roomCode) throw new Error('Create or join a room before setting your name.');
    const response = await emitWithAck<RoomResponse>('UPDATE_DISPLAY_NAME', { roomCode, userId: activeUserId, displayName });
    if (!response.ok) throw new Error(response.error);
    if (response.roomCode) applyRoomState(response as RoomState);
  }, [activeUserId, applyRoomState, emitWithAck, roomCode]);

  const startSession = useCallback(async () => {
    if (!roomCode) throw new Error('Create a room before starting.');
    const response = await emitWithAck<LobbyResponse>('START_SESSION', { roomCode, userId: activeUserId });
    if (!response.ok) throw new Error(response.error);
  }, [activeUserId, emitWithAck, roomCode]);

  const endSession = useCallback(async () => {
    if (!roomCode) throw new Error('Join a room before ending the session.');
    const response = await emitWithAck<LobbyResponse>('END_SESSION', { roomCode, userId: activeUserId });
    if (!response.ok) throw new Error(response.error);
  }, [activeUserId, emitWithAck, roomCode]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('LEAVE_ROOM');
    roomCodeRef.current = null;
    setRoomCode(null);
    setLobbyName('');
    setIsHost(false);
    setPlayersArray([]);
    setIsAllReady(false);
    setIsStackVerified(false);
    setIsSessionStarted(false);
    setIsSessionEnded(false);
    setFinalPlayers([]);
    setFinalActivityTimeline([]);
    setFinalTimelineRange(null);
  }, []);

  return { activeUserId, roomCode, lobbyName, isHost, playersArray, isAllReady, isStackVerified, isSessionStarted, isSessionEnded, finalPlayers, finalActivityTimeline, finalTimelineRange, createRoom, joinRoom, updateDisplayName, startSession, endSession, leaveRoom, updateReadyState, sendShockwaveTimestamp, reportPhoneUse };
}
