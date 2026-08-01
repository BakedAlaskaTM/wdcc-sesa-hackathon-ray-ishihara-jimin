import { useCallback, useEffect, useState } from 'react';
import type { AccelerometerMeasurement } from 'expo-sensors';
import { ActivityIndicator, Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePhoneUsageBill } from './usePhoneUsageBill';
import { useStackLobby } from './useStackLobby';

type Props = { onOpenStack: () => void };
const LOBBY_SERVER_URL = process.env.EXPO_PUBLIC_LOBBY_SERVER_URL ?? 'http://localhost:3001';

export function PhoneUsageBillScreen({ onOpenStack }: Props) {
  const isWeb = Platform.OS === 'web';
  const [simulatedReading, setSimulatedReading] = useState<AccelerometerMeasurement | null>(
    isWeb ? sample(0, 0, -1) : null,
  );
  const [codeInput, setCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const { activeUserId, roomCode, playersArray, createRoom, joinRoom, reportPhoneUse } = useStackLobby(LOBBY_SERVER_URL);
  const { isUsingPhone, billPercent, activeSeconds, resetBill } = usePhoneUsageBill({ simulatedReading });
  const groupPercent = playersArray.find((player) => player.userId === activeUserId)?.billPercent;
  const displayedPercent = roomCode && groupPercent !== undefined ? groupPercent : billPercent;
  const color = isUsingPhone ? '#FF8A65' : '#60D9A2';

  useEffect(() => {
    if (!isUsingPhone || !roomCode) return;
    const timer = setInterval(() => reportPhoneUse().catch((error: Error) => setLobbyError(error.message)), 1000);
    return () => clearInterval(timer);
  }, [isUsingPhone, reportPhoneUse, roomCode]);

  const createGroup = useCallback(async () => {
    setIsJoining(true); setLobbyError(null);
    try { setCodeInput(await createRoom()); } catch (error) { setLobbyError(error instanceof Error ? error.message : 'Could not create group.'); } finally { setIsJoining(false); }
  }, [createRoom]);
  const joinGroup = useCallback(async () => {
    if (!/^\d{4}$/.test(codeInput.trim())) { setLobbyError('Enter a valid 4-digit code.'); return; }
    setIsJoining(true); setLobbyError(null);
    try { await joinRoom(codeInput.trim()); } catch (error) { setLobbyError(error instanceof Error ? error.message : 'Could not join group.'); } finally { setIsJoining(false); }
  }, [codeInput, joinRoom]);

  return (
    <SafeAreaView style={[styles.safeArea, isWeb && styles.webCanvas]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.screen, isWeb && styles.phoneFrame]}>
        <View style={styles.topRow}>
          <Text style={styles.eyebrow}>PHONE FAIR</Text>
          <Pressable onPress={onOpenStack} hitSlop={10}><Text style={styles.link}>Stack mode</Text></Pressable>
        </View>
        <Text style={styles.title}>Your share of the bill</Text>
        <Text style={styles.subtitle}>{roomCode ? 'Your use raises your share while lowering everyone else’s.' : 'Join a group to keep every linked phone’s total at 100%.'}</Text>

        <View style={styles.progressCard}>
          <Text style={[styles.percent, { color }]}>{Math.round(displayedPercent)}%</Text>
          <View style={styles.track}><View style={[styles.fill, { backgroundColor: color, width: `${displayedPercent}%` }]} /></View>
          <View style={styles.statRow}><Text style={styles.statLabel}>Active time</Text><Text style={styles.statValue}>{activeSeconds}s</Text></View>
        </View>

        <View style={styles.groupCard}>
          <Text style={styles.simulatorTitle}>SHARED BILL GROUP</Text>
          {roomCode ? <><Text style={styles.groupCode}>Code {roomCode}</Text><Text style={styles.groupHint}>{playersArray.length} linked phone{playersArray.length === 1 ? '' : 's'} · Total 100%</Text><View style={styles.memberList}>{playersArray.map((player, index) => <View key={player.userId} style={styles.memberRow}><Text style={styles.memberName}>{player.userId === activeUserId ? 'This phone' : `Phone ${index + 1}`}</Text><Text style={styles.memberShare}>{Math.round(player.billPercent)}%</Text></View>)}</View></> : <><View style={styles.codeRow}><TextInput value={codeInput} onChangeText={(value) => setCodeInput(value.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} placeholder="0000" placeholderTextColor="#63708B" style={styles.codeInput} /><Pressable onPress={joinGroup} disabled={isJoining} style={styles.joinButton}>{isJoining ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.joinText}>Join</Text>}</Pressable></View><Pressable onPress={createGroup} disabled={isJoining} style={styles.createButton}><Text style={styles.createText}>Create group</Text></Pressable></>}
          {lobbyError && <Text style={styles.error}>{lobbyError}</Text>}
        </View>

        <View style={[styles.statusCard, { borderColor: color }]}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <View style={styles.statusCopy}>
            <Text style={[styles.status, { color }]}>{isUsingPhone ? 'ON PHONE' : 'NOT ON PHONE'}</Text>
            <Text style={styles.statusHint}>{isUsingPhone ? 'Movement or in-hand posture detected' : 'Phone is flat and still'}</Text>
          </View>
        </View>

        <Pressable onPress={resetBill} style={styles.resetButton}><Text style={styles.resetText}>Reset bill share</Text></Pressable>

        {isWeb && <View style={styles.simulator}>
          <Text style={styles.simulatorTitle}>PC MOTION SIMULATOR</Text>
          <Text style={styles.simulatorHint}>Use these presets to test the usage estimate.</Text>
          <View style={styles.simulatorButtons}>
            <Button label="Phone down" onPress={() => setSimulatedReading(sample(0, 0, -1))} />
            <Button label="Using phone" onPress={() => setSimulatedReading(sample(0.45, 0.1, 0.55))} />
          </View>
        </View>}
      </View>
    </SafeAreaView>
  );
}

function sample(x: number, y: number, z: number): AccelerometerMeasurement { return { x, y, z, timestamp: Date.now() }; }
function Button({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.simulatorButton}><Text style={styles.simulatorButtonText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#10151F' }, webCanvas: { alignItems: 'center', backgroundColor: '#060A11' }, screen: { flex: 1, gap: 20, padding: 24 }, phoneFrame: { alignSelf: 'center', borderColor: '#283349', borderLeftWidth: 1, borderRightWidth: 1, maxWidth: '100%', width: 390 }, topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, eyebrow: { color: '#98A8C5', fontSize: 12, fontWeight: '800', letterSpacing: 2 }, link: { color: '#AFC2FF', fontSize: 14, fontWeight: '700' }, title: { color: '#F4F7FB', fontSize: 30, fontWeight: '800' }, subtitle: { color: '#A7B3C8', fontSize: 15, lineHeight: 22, marginTop: -10 }, progressCard: { backgroundColor: '#1B2331', borderRadius: 20, gap: 16, padding: 22 }, percent: { fontSize: 58, fontVariant: ['tabular-nums'], fontWeight: '800' }, track: { backgroundColor: '#303C52', borderRadius: 8, height: 16, overflow: 'hidden' }, fill: { borderRadius: 8, height: '100%' }, statRow: { flexDirection: 'row', justifyContent: 'space-between' }, statLabel: { color: '#9AA8BE', fontSize: 14 }, statValue: { color: '#F4F7FB', fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '700' }, statusCard: { alignItems: 'center', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 17 }, dot: { borderRadius: 7, height: 14, width: 14 }, statusCopy: { flex: 1, gap: 3 }, status: { fontSize: 15, fontWeight: '800', letterSpacing: 0.7 }, statusHint: { color: '#A7B3C8', fontSize: 13 }, groupCard: { backgroundColor: '#1B2331', borderRadius: 16, gap: 10, padding: 16 }, groupCode: { color: '#F4F7FB', fontSize: 20, fontWeight: '800', letterSpacing: 1 }, groupHint: { color: '#A7B3C8', fontSize: 13 }, memberList: { borderTopColor: '#30405B', borderTopWidth: StyleSheet.hairlineWidth, gap: 7, marginTop: 4, paddingTop: 10 }, memberRow: { flexDirection: 'row', justifyContent: 'space-between' }, memberName: { color: '#DCE5F5', fontSize: 13 }, memberShare: { color: '#F4F7FB', fontSize: 13, fontVariant: ['tabular-nums'], fontWeight: '800' }, codeRow: { flexDirection: 'row', gap: 10 }, codeInput: { backgroundColor: '#10151F', borderColor: '#30405B', borderRadius: 10, borderWidth: 1, color: '#F4F7FB', flex: 1, fontSize: 20, fontWeight: '800', letterSpacing: 6, paddingHorizontal: 12, paddingVertical: 10, textAlign: 'center' }, joinButton: { alignItems: 'center', backgroundColor: '#355CFF', borderRadius: 10, justifyContent: 'center', minWidth: 70, paddingHorizontal: 10 }, joinText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }, createButton: { alignItems: 'center', paddingVertical: 3 }, createText: { color: '#AFC2FF', fontSize: 14, fontWeight: '700' }, error: { color: '#FF9090', fontSize: 13 }, resetButton: { alignItems: 'center', borderColor: '#40506A', borderRadius: 12, borderWidth: 1, padding: 14 }, resetText: { color: '#D7E1F8', fontSize: 15, fontWeight: '700' }, simulator: { borderColor: '#36435A', borderRadius: 14, borderWidth: 1, gap: 10, padding: 16 }, simulatorTitle: { color: '#A8C2FF', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }, simulatorHint: { color: '#8F9BB3', fontSize: 13 }, simulatorButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, simulatorButton: { backgroundColor: '#26324A', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10 }, simulatorButtonText: { color: '#E3EBFF', fontSize: 13, fontWeight: '700' },
});
