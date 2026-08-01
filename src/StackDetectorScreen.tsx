import { useCallback, useEffect, useState } from 'react';
import type { AccelerometerMeasurement } from 'expo-sensors';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePhoneStackDetector } from './usePhoneStackDetector';
import { useStackLobby } from './useStackLobby';
import { EnterNameScreen } from './EnterNameScreen';
import { LobbyWaitingScreen } from './LobbyWaitingScreen';
import { HostWaitingScreen } from './HostWaitingScreen';
import { getLobbyServerUrl } from './lobbyServerUrl';
import { CreateLobbyScreen } from './CreateLobbyScreen';
import { GenerateLobbyCodeScreen } from './GenerateLobbyCodeScreen';

const LOBBY_SERVER_URL = getLobbyServerUrl();
export function StackDetectorScreen({ onOpenHistory, onOpenBill, onOpenDemo, onGameStarted, userId }: { onOpenHistory?: () => void; onOpenBill?: () => void; onOpenDemo?: () => void; onGameStarted?: (roomCode: string, displayName: string) => void; userId?: string }) {
  const [codeInput, setCodeInput] = useState('');
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(null);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [isChoosingDifficulty, setIsChoosingDifficulty] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isWaitingRoom, setIsWaitingRoom] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const isBrowserSimulator = Platform.OS === 'web';
  const [simulatedReading, setSimulatedReading] = useState<AccelerometerMeasurement | null>(
    isBrowserSimulator ? sample(0, 0, 0) : null,
  );
  const { activeUserId, roomCode, isHost, playersArray, isStackVerified, isSessionStarted, createRoom, joinRoom, startSession, leaveRoom, updateReadyState, sendShockwaveTimestamp } = useStackLobby(LOBBY_SERVER_URL, userId);

  const handleShockwave = useCallback((timestamp: number) => {
    sendShockwaveTimestamp(timestamp).catch((error: Error) => setLobbyError(error.message));
  }, [sendShockwaveTimestamp]);

  const { isFaceDown, isLifted, lastShockwaveTime, resetDetector } = usePhoneStackDetector({
    onShockwave: handleShockwave,
    onPhoneLifted: () => setLobbyError('This phone was lifted from the stack.'),
    faceDownZDirection: 'either',
    simulatedReading,
  });

  useEffect(() => {
    if (roomCode) updateReadyState(isFaceDown && !isLifted).catch((error: Error) => setLobbyError(error.message));
  }, [isFaceDown, isLifted, roomCode, updateReadyState]);

  useEffect(() => {
    if (isSessionStarted && roomCode) onGameStarted?.(roomCode, playerName);
  }, [isSessionStarted, onGameStarted, playerName, roomCode]);

  const handleCreateRoom = async () => {
    setIsJoining(true); setLobbyError(null);
    try {
      const code = await createRoom();
      setCodeInput(code);
      setCreatedRoomCode(code);
      setPendingRoomCode(code);
    } catch (error) { setLobbyError(error instanceof Error ? error.message : 'Could not create room.'); } finally { setIsJoining(false); }
  };
  const handleBeginCreate = () => {
    setLobbyError(null);
    setIsChoosingDifficulty(true);
  };
  const handleJoinRoom = async () => {
    const code = codeInput.trim();
    if (!/^\d{4}$/.test(code)) { setLobbyError('Enter a valid 4-digit lobby code.'); return; }
    setLobbyError(null);
    setCreatedRoomCode(null);
    setPendingRoomCode(code);
  };

  const handleNameSubmit = async (name: string) => {
    if (!pendingRoomCode) return;
    setPlayerName(name);
    setIsJoining(true); setLobbyError(null);
    try {
      // Joining again with the chosen name updates the host's existing player
      // record too, avoiding a separate rename event that can be lost on mobile.
      await joinRoom(pendingRoomCode, name);
      setPendingRoomCode(null);
      setIsWaitingRoom(true);
    } catch (error) {
      setLobbyError(error instanceof Error ? error.message : 'Could not join room.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartSession = async () => {
    setIsJoining(true); setLobbyError(null);
    try { await startSession(); }
    catch (error) { setLobbyError(error instanceof Error ? error.message : 'Could not start the session.'); }
    finally { setIsJoining(false); }
  };
  const handleBackToLanding = () => {
    leaveRoom();
    setCodeInput('');
    setPendingRoomCode(null);
    setCreatedRoomCode(null);
    setIsChoosingDifficulty(false);
    setIsWaitingRoom(false);
    setLobbyError(null);
  };

  const activeRoomCode = roomCode;
  const activePlayers = playersArray.map((player, index) => ({ ...player, name: player.displayName || (player.userId === activeUserId && playerName ? playerName : `Phone ${index + 1}`) }));
  // Keep the creator on the host screen even while a socket reconnect is
  // catching up with the server's room state.
  const activeIsHost = isHost || (createdRoomCode !== null && createdRoomCode === roomCode);

  const localStatus = isLifted ? 'PHONE LIFTED' : isStackVerified ? 'STACK VERIFIED' : isFaceDown ? 'PHONE FACE DOWN' : 'LOBBY ACTIVE';
  const statusColor = isLifted ? '#FF6B6B' : isStackVerified ? '#76E5B1' : isFaceDown ? '#82A7FF' : '#F6C667';

  if (pendingRoomCode) {
    return <EnterNameScreen error={lobbyError} isJoining={isJoining} lobbyCode={pendingRoomCode} onBack={handleBackToLanding} onJoin={handleNameSubmit} />;
  }

  if (isWaitingRoom) {
    const waitingPlayers = activePlayers.map(({ userId, name }) => ({ userId, name }));
    if (activeIsHost) return <HostWaitingScreen error={lobbyError} hostUserId={activeUserId} isStarting={isJoining} lobbyCode={activeRoomCode ?? ''} onBack={handleBackToLanding} onStart={handleStartSession} players={waitingPlayers} />;
    return <LobbyWaitingScreen currentUserId={activeUserId} lobbyCode={activeRoomCode ?? ''} onBack={handleBackToLanding} players={waitingPlayers} />;
  }

  if (isChoosingDifficulty) {
    return <GenerateLobbyCodeScreen isLoading={isJoining} onBack={handleBackToLanding} onGenerate={handleCreateRoom} />;
  }

  if (!activeRoomCode) {
    return <CreateLobbyScreen code={codeInput} error={lobbyError} isLoading={isJoining} onChangeCode={setCodeInput} onCreate={handleBeginCreate} onDemo={() => onOpenDemo?.()} onJoin={handleJoinRoom} onOpenHistory={onOpenHistory} />;
  }

  return <SafeAreaView style={[styles.safeArea, isBrowserSimulator && styles.webCanvas]}><StatusBar barStyle="dark-content" backgroundColor="#AAB7E9" /><ScrollView style={styles.scroll} contentContainerStyle={[styles.container, isBrowserSimulator && styles.phoneFrame]} keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={styles.titleRow}><View style={styles.titleCopy}><Text style={styles.eyebrow}>STACK LOBBY</Text><Text style={styles.title}>phones, <Text style={styles.titleAccent}>together.</Text></Text></View><View style={styles.navButtons}>{onOpenBill && <Pressable onPress={onOpenBill} style={styles.historyButton}><Text style={styles.historyButtonText}>My bill</Text></Pressable>}{onOpenHistory && <Pressable onPress={onOpenHistory} style={styles.historyButton}><Text style={styles.historyButtonText}>History</Text></Pressable>}</View></View>
    <View style={styles.statusCard}><View style={[styles.dot, { backgroundColor: statusColor }]} /><View style={styles.statusCopy}><Text style={[styles.status, { color: statusColor }]}>{localStatus}</Text><Text style={styles.statusHint}>{lastShockwaveTime ? `Last impact ${new Date(lastShockwaveTime).toLocaleTimeString()}` : 'Sensor is active'}</Text></View><Pressable onPress={resetDetector} hitSlop={10}><Text style={styles.reset}>Reset</Text></Pressable></View>
    {!activeRoomCode && <View style={styles.codeCard}><Text style={styles.sectionLabel}>LOBBY CODE</Text><View style={styles.codeRow}><TextInput value={codeInput} onChangeText={(value) => setCodeInput(value.replace(/\D/g, '').slice(0, 4))} editable={!isJoining} keyboardType="number-pad" maxLength={4} placeholder="0000" placeholderTextColor="#63708B" style={styles.codeInput} /><Pressable disabled={isJoining} onPress={handleJoinRoom} style={styles.joinButton}>{isJoining ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.joinText}>Join</Text>}</Pressable></View><Pressable disabled={isJoining} onPress={handleCreateRoom} style={styles.createButton}><Text style={styles.createText}>Create a new lobby</Text></Pressable>{lobbyError && <Text style={styles.error}>{lobbyError}</Text>}</View>}
    {activeRoomCode ? <View style={styles.playersCard}><View style={styles.playersHeader}><View style={styles.roomDetails}><Text style={styles.sectionLabel}>LIVE LOBBY</Text><Text style={styles.roomCode}>{activeRoomCode} {activeIsHost ? '• HOST' : ''}</Text></View><Text style={styles.count}>{activePlayers.length} connected</Text></View><View style={styles.divider} />{activePlayers.map((player) => <View key={player.userId} style={styles.playerRow}><View style={[styles.playerDot, { backgroundColor: '#237050' }]} /><Text numberOfLines={1} style={styles.playerName}>{player.name}</Text><Text style={[styles.playerState, { color: '#237050' }]}>CONNECTED</Text></View>)}</View> : <Text style={styles.emptyState}>Create a lobby or enter a code to join one.</Text>}
    {isBrowserSimulator && <View style={styles.simulator}><Text style={styles.sectionLabel}>PC SENSOR SIMULATOR</Text><Text style={styles.simulatorHint}>Inject G-force samples into the same detector hook.</Text><View style={styles.simulatorButtons}><SimulatorButton label="Place flat" onPress={() => setSimulatedReading(sample(0, 0, -1))} /><SimulatorButton label="Tap / shock" onPress={() => setSimulatedReading(sample(0, 0, -2.6))} /><SimulatorButton label="Lift phone" onPress={() => setSimulatedReading(sample(0, 0.7, -0.5))} /></View></View>}
  </ScrollView></SafeAreaView>;
}

function sample(x: number, y: number, z: number): AccelerometerMeasurement { return { x, y, z, timestamp: Date.now() }; }
function SimulatorButton({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.simulatorButton}><Text style={styles.simulatorButtonText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' }, titleCopy: { flex: 1, minWidth: 0 }, navButtons: { flexDirection: 'row', flexShrink: 0, gap: 6 }, historyButton: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 12, borderWidth: 2, flexShrink: 0, paddingHorizontal: 10, paddingVertical: 8 }, historyButtonText: { color: '#15121F', fontSize: 12, fontWeight: '800' },
  safeArea: { flex: 1, backgroundColor: '#AAB7E9' }, scroll: { flex: 1, width: '100%' }, webCanvas: { backgroundColor: '#E9E3D0' }, phoneFrame: { alignSelf: 'center', borderColor: '#15121F', borderLeftWidth: 3, borderRightWidth: 3, maxWidth: '100%', minHeight: '100%', width: 390 }, container: { gap: 18, padding: 24, width: '100%' }, eyebrow: { color: 'rgba(21,18,31,0.58)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#15121F', flexShrink: 1, fontSize: 26, fontWeight: '800', marginTop: 4 }, titleAccent: { color: '#3E4AA0' }, statusCard: { alignItems: 'center', backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 18, borderWidth: 2.5, flexDirection: 'row', gap: 12, padding: 16 }, dot: { width: 12, height: 12, borderRadius: 6 }, statusCopy: { flex: 1, minWidth: 0, gap: 3 }, status: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 }, statusHint: { color: 'rgba(21,18,31,0.6)', fontSize: 12 }, reset: { color: '#3E4AA0', fontSize: 13, fontWeight: '800' }, codeCard: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 18, borderWidth: 2.5, gap: 12, padding: 18 }, sectionLabel: { color: '#15121F', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }, codeRow: { flexDirection: 'row', gap: 10, width: '100%' }, codeInput: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 14, borderWidth: 2.5, color: '#15121F', flex: 1, minWidth: 0, fontSize: 24, fontWeight: '800', letterSpacing: 6, paddingHorizontal: 10, paddingVertical: 12, textAlign: 'center' }, joinButton: { alignItems: 'center', backgroundColor: '#15121F', borderColor: '#15121F', borderRadius: 14, borderWidth: 2.5, flexShrink: 0, justifyContent: 'center', minHeight: 52, minWidth: 72, paddingHorizontal: 12 }, joinText: { color: '#F5EFDA', fontSize: 15, fontWeight: '800' }, createButton: { alignItems: 'center', paddingVertical: 8 }, createText: { color: '#3E4AA0', fontSize: 14, fontWeight: '800', textAlign: 'center' }, error: { color: '#761C2C', fontSize: 13, flexShrink: 1 }, demoHint: { color: 'rgba(21,18,31,0.5)', fontSize: 12, textAlign: 'center' }, playersCard: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 18, borderWidth: 2.5, padding: 18 }, playersHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' }, roomDetails: { flex: 1, minWidth: 0 }, roomCode: { color: '#15121F', fontSize: 22, fontWeight: '800', letterSpacing: 2, marginTop: 4 }, count: { color: '#3E4AA0', flexShrink: 0, fontSize: 13, fontWeight: '800' }, countReady: { color: '#237050' }, divider: { backgroundColor: '#15121F', height: 2, marginVertical: 15, opacity: 0.2 }, playerRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 9 }, playerDot: { borderColor: '#15121F', borderRadius: 5, borderWidth: 1, flexShrink: 0, height: 10, width: 10 }, playerName: { color: '#15121F', flex: 1, minWidth: 0, fontSize: 15, fontWeight: '700' }, playerState: { flexShrink: 0, fontSize: 12, fontWeight: '800' }, leaveButton: { alignItems: 'center', borderColor: '#15121F', borderRadius: 12, borderWidth: 2, marginTop: 14, minHeight: 44, justifyContent: 'center', paddingVertical: 10 }, leaveText: { color: '#3E4AA0', fontSize: 13, fontWeight: '800' }, emptyState: { color: 'rgba(21,18,31,0.6)', fontSize: 14, lineHeight: 20, textAlign: 'center' }, simulator: { backgroundColor: 'rgba(245,239,218,0.45)', borderColor: '#15121F', borderRadius: 14, borderWidth: 2, padding: 16, gap: 10 }, simulatorHint: { color: 'rgba(21,18,31,0.6)', fontSize: 13 }, simulatorButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, simulatorButton: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 9, borderWidth: 2, minHeight: 40, paddingHorizontal: 11, paddingVertical: 9 }, simulatorButtonText: { color: '#15121F', fontSize: 13, fontWeight: '800' },
});
