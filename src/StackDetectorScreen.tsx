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

const LOBBY_SERVER_URL = process.env.EXPO_PUBLIC_LOBBY_SERVER_URL ?? 'http://localhost:3001';
const DEMO_ROOM_CODE = '1111';
const DEMO_PLAYERS = [
  { userId: 'ray', name: 'Ray', isReadyOnStack: true },
  { userId: 'jimin', name: 'Jimin', isReadyOnStack: false },
  { userId: 'ishihara', name: 'Ishihara', isReadyOnStack: true },
];

export function StackDetectorScreen({ onOpenHistory }: { onOpenHistory?: () => void }) {
  const [codeInput, setCodeInput] = useState('');
  const [isDemoRoom, setIsDemoRoom] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const isBrowserSimulator = Platform.OS === 'web';
  const [simulatedReading, setSimulatedReading] = useState<AccelerometerMeasurement | null>(
    isBrowserSimulator ? sample(0, 0, 0) : null,
  );
  const { roomCode, isHost, playersArray, isStackVerified, createRoom, joinRoom, updateReadyState, sendShockwaveTimestamp } = useStackLobby(LOBBY_SERVER_URL);

  const handleShockwave = useCallback((timestamp: number) => {
    if (isDemoRoom) return;
    sendShockwaveTimestamp(timestamp).catch((error: Error) => setLobbyError(error.message));
  }, [isDemoRoom, sendShockwaveTimestamp]);

  const { isFaceDown, isLifted, lastShockwaveTime, resetDetector } = usePhoneStackDetector({
    onShockwave: handleShockwave,
    onPhoneLifted: () => setLobbyError('This phone was lifted from the stack.'),
    faceDownZDirection: 'either',
    simulatedReading,
  });

  useEffect(() => {
    if (roomCode && !isDemoRoom) updateReadyState(isFaceDown && !isLifted).catch((error: Error) => setLobbyError(error.message));
  }, [isDemoRoom, isFaceDown, isLifted, roomCode, updateReadyState]);

  const handleCreateRoom = async () => {
    setIsJoining(true); setLobbyError(null);
    try { setCodeInput(await createRoom()); } catch (error) { setLobbyError(error instanceof Error ? error.message : 'Could not create room.'); } finally { setIsJoining(false); }
  };
  const handleJoinRoom = async () => {
    const code = codeInput.trim();
    if (!/^\d{4}$/.test(code)) { setLobbyError('Enter a valid 4-digit lobby code.'); return; }
    if (code === DEMO_ROOM_CODE) {
      setLobbyError(null);
      setIsDemoRoom(true);
      return;
    }
    setIsJoining(true); setLobbyError(null);
    try { await joinRoom(code); } catch (error) { setLobbyError(error instanceof Error ? error.message : 'Could not join room.'); } finally { setIsJoining(false); }
  };

  const activeRoomCode = isDemoRoom ? DEMO_ROOM_CODE : roomCode;
  const activePlayers = isDemoRoom
    ? DEMO_PLAYERS
    : playersArray.map((player, index) => ({ ...player, name: `Phone ${index + 1}` }));
  const activeIsHost = isDemoRoom || isHost;
  const activeIsAllReady = activePlayers.length > 0 && activePlayers.every((player) => player.isReadyOnStack);

  const localStatus = isLifted ? 'PHONE LIFTED' : isStackVerified ? 'STACK VERIFIED' : activeIsAllReady ? 'WAITING FOR IMPACT' : isFaceDown ? 'READY ON STACK' : 'PLACE PHONE FACE DOWN';
  const statusColor = isLifted ? '#FF6B6B' : isStackVerified ? '#76E5B1' : isFaceDown ? '#82A7FF' : '#F6C667';

  return <SafeAreaView style={[styles.safeArea, isBrowserSimulator && styles.webCanvas]}><StatusBar barStyle="light-content" /><ScrollView style={styles.scroll} contentContainerStyle={[styles.container, isBrowserSimulator && styles.phoneFrame]} keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={styles.titleRow}><View style={styles.titleCopy}><Text style={styles.eyebrow}>STACK LOBBY</Text><Text style={styles.title}>Phones, ready together.</Text></View>{onOpenHistory && <Pressable onPress={onOpenHistory} style={styles.historyButton}><Text style={styles.historyButtonText}>History</Text></Pressable>}</View>
    <View style={styles.statusCard}><View style={[styles.dot, { backgroundColor: statusColor }]} /><View style={styles.statusCopy}><Text style={[styles.status, { color: statusColor }]}>{localStatus}</Text><Text style={styles.statusHint}>{lastShockwaveTime ? `Last impact ${new Date(lastShockwaveTime).toLocaleTimeString()}` : 'Sensor is active'}</Text></View><Pressable onPress={resetDetector} hitSlop={10}><Text style={styles.reset}>Reset</Text></Pressable></View>
    {!activeRoomCode && <View style={styles.codeCard}><Text style={styles.sectionLabel}>LOBBY CODE</Text><View style={styles.codeRow}><TextInput value={codeInput} onChangeText={(value) => setCodeInput(value.replace(/\D/g, '').slice(0, 4))} editable={!isJoining} keyboardType="number-pad" maxLength={4} placeholder="0000" placeholderTextColor="#63708B" style={styles.codeInput} /><Pressable disabled={isJoining} onPress={handleJoinRoom} style={styles.joinButton}>{isJoining ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.joinText}>Join</Text>}</Pressable></View><Pressable disabled={isJoining} onPress={handleCreateRoom} style={styles.createButton}><Text style={styles.createText}>Create a new lobby</Text></Pressable>{lobbyError && <Text style={styles.error}>{lobbyError}</Text>}<Text style={styles.demoHint}>Demo room: 1111</Text></View>}
    {activeRoomCode ? <View style={styles.playersCard}><View style={styles.playersHeader}><View style={styles.roomDetails}><Text style={styles.sectionLabel}>LIVE LOBBY</Text><Text style={styles.roomCode}>{activeRoomCode} {activeIsHost ? '• HOST' : ''}</Text></View><Text style={[styles.count, activeIsAllReady && styles.countReady]}>{activePlayers.filter((player) => player.isReadyOnStack).length}/{activePlayers.length} ready</Text></View><View style={styles.divider} />{activePlayers.map((player) => <View key={player.userId} style={styles.playerRow}><View style={[styles.playerDot, { backgroundColor: player.isReadyOnStack ? '#76E5B1' : '#F6C667' }]} /><Text numberOfLines={1} style={styles.playerName}>{player.name}</Text><Text style={[styles.playerState, { color: player.isReadyOnStack ? '#76E5B1' : '#F6C667' }]}>{player.isReadyOnStack ? 'ON STACK' : 'NOT READY'}</Text></View>)}{isDemoRoom && <Pressable onPress={() => { setIsDemoRoom(false); setCodeInput(''); }} style={styles.leaveButton}><Text style={styles.leaveText}>Leave lobby</Text></Pressable>}</View> : <Text style={styles.emptyState}>Enter a code to see every phone in the lobby.</Text>}
    {isBrowserSimulator && <View style={styles.simulator}><Text style={styles.sectionLabel}>PC SENSOR SIMULATOR</Text><Text style={styles.simulatorHint}>Inject G-force samples into the same detector hook.</Text><View style={styles.simulatorButtons}><SimulatorButton label="Place flat" onPress={() => setSimulatedReading(sample(0, 0, -1))} /><SimulatorButton label="Tap / shock" onPress={() => setSimulatedReading(sample(0, 0, -2.6))} /><SimulatorButton label="Lift phone" onPress={() => setSimulatedReading(sample(0, 0.7, -0.5))} /></View></View>}
  </ScrollView></SafeAreaView>;
}

function sample(x: number, y: number, z: number): AccelerometerMeasurement { return { x, y, z, timestamp: Date.now() }; }
function SimulatorButton({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.simulatorButton}><Text style={styles.simulatorButtonText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' }, titleCopy: { flex: 1, minWidth: 0 }, historyButton: { backgroundColor: '#26324A', borderRadius: 10, flexShrink: 0, paddingHorizontal: 12, paddingVertical: 9 }, historyButtonText: { color: '#AFC2FF', fontSize: 13, fontWeight: '800' },
  safeArea: { flex: 1, backgroundColor: '#10151F' }, scroll: { flex: 1, width: '100%' }, webCanvas: { backgroundColor: '#060A11' }, phoneFrame: { alignSelf: 'center', borderColor: '#283349', borderLeftWidth: 1, borderRightWidth: 1, maxWidth: '100%', minHeight: '100%', width: 390 }, container: { gap: 18, padding: 24, width: '100%' }, eyebrow: { color: '#8290AA', fontSize: 12, fontWeight: '800', letterSpacing: 2 }, title: { color: '#F4F7FB', flexShrink: 1, fontSize: 26, fontWeight: '800', marginTop: 4 }, statusCard: { alignItems: 'center', backgroundColor: '#1B2331', borderRadius: 18, flexDirection: 'row', gap: 12, padding: 16 }, dot: { width: 12, height: 12, borderRadius: 6 }, statusCopy: { flex: 1, minWidth: 0, gap: 3 }, status: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 }, statusHint: { color: '#A7B3C8', fontSize: 12 }, reset: { color: '#AFC2FF', fontSize: 13, fontWeight: '700' }, codeCard: { backgroundColor: '#1B2331', borderRadius: 18, gap: 12, padding: 18 }, sectionLabel: { color: '#8290AA', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }, codeRow: { flexDirection: 'row', gap: 10, width: '100%' }, codeInput: { backgroundColor: '#10151F', borderColor: '#30405B', borderRadius: 12, borderWidth: 1, color: '#F4F7FB', flex: 1, minWidth: 0, fontSize: 24, fontWeight: '800', letterSpacing: 6, paddingHorizontal: 10, paddingVertical: 12, textAlign: 'center' }, joinButton: { alignItems: 'center', backgroundColor: '#355CFF', borderRadius: 12, flexShrink: 0, justifyContent: 'center', minHeight: 52, minWidth: 72, paddingHorizontal: 12 }, joinText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }, createButton: { alignItems: 'center', paddingVertical: 8 }, createText: { color: '#AFC2FF', fontSize: 14, fontWeight: '700', textAlign: 'center' }, error: { color: '#FF9090', fontSize: 13, flexShrink: 1 }, demoHint: { color: '#63708B', fontSize: 12, textAlign: 'center' }, playersCard: { backgroundColor: '#1B2331', borderRadius: 18, padding: 18 }, playersHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' }, roomDetails: { flex: 1, minWidth: 0 }, roomCode: { color: '#F4F7FB', fontSize: 22, fontWeight: '800', letterSpacing: 2, marginTop: 4 }, count: { color: '#F6C667', flexShrink: 0, fontSize: 13, fontWeight: '700' }, countReady: { color: '#76E5B1' }, divider: { backgroundColor: '#30405B', height: 1, marginVertical: 15 }, playerRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 9 }, playerDot: { borderRadius: 5, flexShrink: 0, height: 10, width: 10 }, playerName: { color: '#F4F7FB', flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600' }, playerState: { flexShrink: 0, fontSize: 12, fontWeight: '800' }, leaveButton: { alignItems: 'center', borderColor: '#30405B', borderRadius: 10, borderWidth: 1, marginTop: 14, minHeight: 44, justifyContent: 'center', paddingVertical: 10 }, leaveText: { color: '#AFC2FF', fontSize: 13, fontWeight: '700' }, emptyState: { color: '#8290AA', fontSize: 14, lineHeight: 20, textAlign: 'center' }, simulator: { borderColor: '#36435A', borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 }, simulatorHint: { color: '#8F9BB3', fontSize: 13 }, simulatorButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, simulatorButton: { backgroundColor: '#26324A', borderRadius: 9, minHeight: 40, paddingHorizontal: 11, paddingVertical: 9 }, simulatorButtonText: { color: '#E3EBFF', fontSize: 13, fontWeight: '700' },
});
