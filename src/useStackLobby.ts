import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export type StackPlayer = { userId: string; isReadyOnStack: boolean; billPercent: number };
type RoomState = { roomCode: string; hostUserId: string; players: StackPlayer[]; stackVerified: boolean };
type LobbyResponse = { ok: true; error?: never } | { ok: false; error: string };
type RoomResponse = LobbyResponse & Partial<RoomState>;

export function useStackLobby(serverUrl: string, userId?: string) {
  const generatedUserId = useRef(`player-${Math.random().toString(36).slice(2, 10)}`);
  const activeUserId = userId ?? generatedUserId.current;
  const socketRef = useRef<Socket | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [playersArray, setPlayersArray] = useState<StackPlayer[]>([]);
  const [isAllReady, setIsAllReady] = useState(false);
  const [isStackVerified, setIsStackVerified] = useState(false);

  const applyRoomState = useCallback((state: RoomState) => {
    setRoomCode(state.roomCode);
    setIsHost(state.hostUserId === activeUserId);
    setPlayersArray(state.players);
    setIsAllReady(state.players.length > 0 && state.players.every((player) => player.isReadyOnStack));
    setIsStackVerified(state.stackVerified);
  }, [activeUserId]);

  useEffect(() => {
    const socket = io(serverUrl);
    socketRef.current = socket;
    socket.on('PLAYER_LIST_UPDATED', applyRoomState);
    socket.on('ALL_STACKED_READY', () => setIsAllReady(true));
    socket.on('STACK_VERIFIED', () => setIsStackVerified(true));
    return () => {
      socket.emit('LEAVE_ROOM');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [applyRoomState, serverUrl]);

  const emitWithAck = useCallback(<T,>(event: string, payload: object): Promise<T> => {
    const socket = socketRef.current;
    if (!socket?.connected) return Promise.reject(new Error('Lobby server is not connected.'));
    return new Promise((resolve, reject) => {
      socket.timeout(5_000).emit(event, payload, (error: Error | null, response: T) => {
        if (error) reject(new Error(`Timed out waiting for ${event}.`));
        else resolve(response);
      });
    });
  }, []);

  const createRoom = useCallback(async () => {
    const response = await emitWithAck<RoomResponse>('CREATE_ROOM', { userId: activeUserId });
    if (!response.ok || !response.roomCode) throw new Error(response.error ?? 'Could not create room.');
    applyRoomState(response as RoomState);
    return response.roomCode;
  }, [activeUserId, applyRoomState, emitWithAck]);

  const joinRoom = useCallback(async (code: string) => {
    const response = await emitWithAck<RoomResponse>('JOIN_ROOM', { roomCode: code, userId: activeUserId });
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

  const reportPhoneUse = useCallback(async () => {
    if (!roomCode) throw new Error('Join a room before reporting phone use.');
    const response = await emitWithAck<LobbyResponse>('PHONE_USAGE_TICK', { roomCode, userId: activeUserId });
    if (!response.ok) throw new Error(response.error);
  }, [activeUserId, emitWithAck, roomCode]);

  return { activeUserId, roomCode, isHost, playersArray, isAllReady, isStackVerified, createRoom, joinRoom, updateReadyState, sendShockwaveTimestamp, reportPhoneUse };
}
