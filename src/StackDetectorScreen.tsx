import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useStackLobby } from './useStackLobby';
import { usePhoneStackDetector } from './usePhoneStackDetector';

// On physical phones, set EXPO_PUBLIC_LOBBY_SERVER_URL to your computer's LAN address.
const LOBBY_SERVER_URL = process.env.EXPO_PUBLIC_LOBBY_SERVER_URL ?? 'http://localhost:3001';

export function StackDetectorScreen() {
  const [codeInput, setCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const {
    roomCode,
    isHost,
    playersArray,
    isAllReady,
    isStackVerified,
    createRoom,
    joinRoom,
    updateReadyState,
    sendShockwaveTimestamp,
  } = useStackLobby(LOBBY_SERVER_URL);

  const handleShockwave = useCallback((timestamp: number) => {
    sendShockwaveTimestamp(timestamp).catch((error: Error) => setLobbyError(error.message));
  }, [sendShockwaveTimestamp]);

  const { isFaceDown, isLifted, lastShockwaveTime, resetDetector } = usePhoneStackDetector({
    onShockwave: handleShockwave,
    onPhoneLifted: () => setLobbyError('This phone was lifted from the stack.'),
    faceDownZDirection: 'either',
  });

  useEffect(() => {
    if (!roomCode) return;
    updateReadyState(isFaceDown && !isLifted).catch((error: Error) => setLobbyError(error.message));
  }, [isFaceDown, isLifted, roomCode, updateReadyState]);

  const handleCreateRoom = async () => {
    setIsJoining(true);
    setLobbyError(null);
    try {
      setCodeInput(await createRoom());
    } catch (error) {
      setLobbyError(error instanceof Error ? error.message : 'Could not create room.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinRoom = async () => {
    const code = codeInput.trim();
    if (!/^\d{4}$/.test(code)) {
      setLobbyError('Enter a valid 4-digit lobby code.');
      return;
    }
    setIsJoining(true);
    setLobbyError(null);
    try {
      await joinRoom(code);
    } catch (error) {
      setLobbyError(error instanceof Error ? error.message : 'Could not join room.');
    } finally {
      setIsJoining(false);
    }
  };

  const localStatus = isLifted
    ? 'PHONE LIFTED'
    : isStackVerified
      ? 'STACK VERIFIED'
      : isAllReady
        ? 'WAITING FOR IMPACT'
        : isFaceDown
          ? 'READY ON STACK'
          : 'PLACE PHONE FACE DOWN';
  const statusColor = isLifted ? '#FF6B6B' : isStackVerified ? '#76E5B1' : isFaceDown ? '#82A7FF' : '#F6C667';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <Text style={styles.eyebrow}>STACK LOBBY</Text>
        <Text style={styles.title}>Phones, ready together.</Text>

        <View style={styles.statusCard}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <View style={styles.statusCopy}>
            <Text style={[styles.status, { color: statusColor }]}>{localStatus}</Text>
            <Text style={styles.statusHint}>
              {lastShockwaveTime ? `Last impact ${new Date(lastShockwaveTime).toLocaleTimeString()}` : 'Sensor is active'}
            </Text>
          </View>
          <Pressable onPress={resetDetector} hitSlop={10}>
            <Text style={styles.reset}>Reset</Text>
          </Pressable>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.sectionLabel}>LOBBY CODE</Text>
          <View style={styles.codeRow}>
            <TextInput
              value={codeInput}
              onChangeText={(value) => setCodeInput(value.replace(/\D/g, '').slice(0, 4))}
              editable={!roomCode && !isJoining}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="0000"
              placeholderTextColor="#63708B"
              style={styles.codeInput}
            />
            <Pressable disabled={Boolean(roomCode) || isJoining} onPress={handleJoinRoom} style={styles.joinButton}>
              {isJoining ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.joinText}>Join</Text>}
            </Pressable>
          </View>
          {!roomCode && (
            <Pressable disabled={isJoining} onPress={handleCreateRoom} style={styles.createButton}>
              <Text style={styles.createText}>Create a new lobby</Text>
            </Pressable>
          )}
          {lobbyError && <Text style={styles.error}>{lobbyError}</Text>}
        </View>

        {roomCode ? (
          <View style={styles.playersCard}>
            <View style={styles.playersHeader}>
              <View>
                <Text style={styles.sectionLabel}>LIVE LOBBY</Text>
                <Text style={styles.roomCode}>{roomCode} {isHost ? '• HOST' : ''}</Text>
              </View>
              <Text style={[styles.count, isAllReady && styles.countReady]}>
                {playersArray.filter((player) => player.isReadyOnStack).length}/{playersArray.length} ready
              </Text>
            </View>
            <View style={styles.divider} />
            {playersArray.map((player, index) => (
              <View key={player.userId} style={styles.playerRow}>
                <View style={[styles.playerDot, { backgroundColor: player.isReadyOnStack ? '#76E5B1' : '#F6C667' }]} />
                <Text style={styles.playerName}>Phone {index + 1}</Text>
                <Text style={[styles.playerState, { color: player.isReadyOnStack ? '#76E5B1' : '#F6C667' }]}>
                  {player.isReadyOnStack ? 'ON STACK' : 'NOT READY'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyState}>Enter a code to see every phone in the lobby.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#10151F' },
  container: { flex: 1, padding: 24, gap: 18 },
  eyebrow: { color: '#8290AA', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#F4F7FB', fontSize: 28, fontWeight: '800', marginTop: -10 },
  statusCard: { alignItems: 'center', backgroundColor: '#1B2331', borderRadius: 18, flexDirection: 'row', gap: 12, padding: 16 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusCopy: { flex: 1, gap: 3 },
  status: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  statusHint: { color: '#A7B3C8', fontSize: 12 },
  reset: { color: '#AFC2FF', fontSize: 13, fontWeight: '700' },
  codeCard: { backgroundColor: '#1B2331', borderRadius: 18, gap: 12, padding: 18 },
  sectionLabel: { color: '#8290AA', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  codeRow: { flexDirection: 'row', gap: 10 },
  codeInput: { backgroundColor: '#10151F', borderColor: '#30405B', borderRadius: 12, borderWidth: 1, color: '#F4F7FB', flex: 1, fontSize: 24, fontWeight: '800', letterSpacing: 8, paddingHorizontal: 16, paddingVertical: 12, textAlign: 'center' },
  joinButton: { alignItems: 'center', backgroundColor: '#355CFF', borderRadius: 12, justifyContent: 'center', minWidth: 78, paddingHorizontal: 12 },
  joinText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  createButton: { alignItems: 'center', paddingVertical: 4 },
  createText: { color: '#AFC2FF', fontSize: 14, fontWeight: '700' },
  error: { color: '#FF9090', fontSize: 13 },
  playersCard: { backgroundColor: '#1B2331', borderRadius: 18, padding: 18 },
  playersHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  roomCode: { color: '#F4F7FB', fontSize: 22, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  count: { color: '#F6C667', fontSize: 13, fontWeight: '700' },
  countReady: { color: '#76E5B1' },
  divider: { backgroundColor: '#30405B', height: 1, marginVertical: 15 },
  playerRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 9 },
  playerDot: { borderRadius: 5, height: 10, width: 10 },
  playerName: { color: '#F4F7FB', flex: 1, fontSize: 15, fontWeight: '600' },
  playerState: { fontSize: 12, fontWeight: '800' },
  emptyState: { color: '#8290AA', fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
