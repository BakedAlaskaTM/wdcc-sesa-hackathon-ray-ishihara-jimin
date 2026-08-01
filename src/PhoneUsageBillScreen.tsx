import { useCallback, useEffect, useState } from 'react';
import type { AccelerometerMeasurement } from 'expo-sensors';
import { ActivityIndicator, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePhoneUsageBill } from './usePhoneUsageBill';
import { useStackLobby } from './useStackLobby';
import { getLobbyServerUrl } from './lobbyServerUrl';

type Props = { onOpenStack: () => void };
const LOBBY_SERVER_URL = getLobbyServerUrl();

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
      <StatusBar barStyle="dark-content" backgroundColor="#AAB7E9" />
      <ScrollView contentContainerStyle={[styles.screen, isWeb && styles.phoneFrame]} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.eyebrow}>PHONE FAIR</Text>
          <Pressable onPress={onOpenStack} hitSlop={10}><Text style={styles.link}>Stack mode</Text></Pressable>
        </View>
        <Text style={styles.title}>your share of the <Text style={styles.titleAccent}>bill</Text></Text>
        <Text style={styles.subtitle}>{roomCode ? 'Your use raises your share while lowering everyone else’s.' : 'Join a group to keep every linked phone’s total at 100%.'}</Text>

        <View style={styles.progressCard}>
          <Text style={[styles.percent, { color }]}>{Math.round(displayedPercent)}%</Text>
          <View style={styles.track}><View style={[styles.fill, { backgroundColor: color, width: `${displayedPercent}%` }]} /></View>
          <View style={styles.statRow}><Text style={styles.statLabel}>Active time</Text><Text style={styles.statValue}>{activeSeconds}s</Text></View>
        </View>

        <View style={styles.groupCard}>
          <Text style={styles.simulatorTitle}>SHARED BILL GROUP</Text>
          {roomCode ? <><Text style={styles.groupCode}>Code {roomCode}</Text><Text style={styles.groupHint}>{playersArray.length} linked phone{playersArray.length === 1 ? '' : 's'} · Total 100%</Text><View style={styles.memberList}>{playersArray.map((player, index) => <View key={player.userId} style={styles.memberRow}><Text style={styles.memberName}>{player.userId === activeUserId ? 'This phone' : player.displayName || `Phone ${index + 1}`}</Text><Text style={styles.memberShare}>{Math.round(player.billPercent)}%</Text></View>)}</View></> : <><View style={styles.codeRow}><TextInput value={codeInput} onChangeText={(value) => setCodeInput(value.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} placeholder="0000" placeholderTextColor="#63708B" style={styles.codeInput} /><Pressable onPress={joinGroup} disabled={isJoining} style={styles.joinButton}>{isJoining ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.joinText}>Join</Text>}</Pressable></View><Pressable onPress={createGroup} disabled={isJoining} style={styles.createButton}><Text style={styles.createText}>Create group</Text></Pressable></>}
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
      </ScrollView>
    </SafeAreaView>
  );
}

function sample(x: number, y: number, z: number): AccelerometerMeasurement { return { x, y, z, timestamp: Date.now() }; }
function Button({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.simulatorButton}><Text style={styles.simulatorButtonText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#AAB7E9' }, webCanvas: { backgroundColor: '#E9E3D0' }, screen: { flexGrow: 1, gap: 20, padding: 24, width: '100%' }, phoneFrame: { alignSelf: 'center', borderColor: '#15121F', borderLeftWidth: 3, borderRightWidth: 3, maxWidth: '100%', minHeight: '100%', width: 390 }, topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, eyebrow: { color: 'rgba(21,18,31,0.58)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, link: { color: '#3E4AA0', fontSize: 14, fontWeight: '800' }, title: { color: '#15121F', fontSize: 30, fontWeight: '800' }, titleAccent: { color: '#3E4AA0' }, subtitle: { color: 'rgba(21,18,31,0.62)', fontSize: 14, fontWeight: '600', lineHeight: 21, marginTop: -10 }, progressCard: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 20, borderWidth: 2.5, gap: 16, padding: 22 }, percent: { fontSize: 58, fontVariant: ['tabular-nums'], fontWeight: '800' }, track: { backgroundColor: 'rgba(21,18,31,0.14)', borderColor: '#15121F', borderRadius: 8, borderWidth: 1, height: 16, overflow: 'hidden' }, fill: { borderRadius: 8, height: '100%' }, statRow: { flexDirection: 'row', justifyContent: 'space-between' }, statLabel: { color: 'rgba(21,18,31,0.62)', fontSize: 14, fontWeight: '600' }, statValue: { color: '#15121F', fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '800' }, statusCard: { alignItems: 'center', backgroundColor: '#F5EFDA', borderRadius: 16, borderWidth: 2.5, flexDirection: 'row', gap: 12, padding: 17 }, dot: { borderColor: '#15121F', borderRadius: 7, borderWidth: 1, height: 14, width: 14 }, statusCopy: { flex: 1, gap: 3 }, status: { fontSize: 15, fontWeight: '800', letterSpacing: 0.7 }, statusHint: { color: 'rgba(21,18,31,0.62)', fontSize: 13 }, groupCard: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, gap: 10, padding: 16 }, groupCode: { color: '#15121F', fontSize: 20, fontWeight: '800', letterSpacing: 1 }, groupHint: { color: 'rgba(21,18,31,0.62)', fontSize: 13 }, memberList: { borderTopColor: 'rgba(21,18,31,0.2)', borderTopWidth: 1.5, gap: 7, marginTop: 4, paddingTop: 10 }, memberRow: { flexDirection: 'row', justifyContent: 'space-between' }, memberName: { color: '#15121F', fontSize: 13, fontWeight: '700' }, memberShare: { color: '#15121F', fontSize: 13, fontVariant: ['tabular-nums'], fontWeight: '800' }, codeRow: { flexDirection: 'row', gap: 10 }, codeInput: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 12, borderWidth: 2.5, color: '#15121F', flex: 1, minWidth: 0, fontSize: 20, fontWeight: '800', letterSpacing: 6, paddingHorizontal: 12, paddingVertical: 10, textAlign: 'center' }, joinButton: { alignItems: 'center', backgroundColor: '#15121F', borderRadius: 12, justifyContent: 'center', minWidth: 70, paddingHorizontal: 10 }, joinText: { color: '#F5EFDA', fontSize: 14, fontWeight: '800' }, createButton: { alignItems: 'center', paddingVertical: 7 }, createText: { color: '#3E4AA0', fontSize: 14, fontWeight: '800' }, error: { color: '#761C2C', fontSize: 13, fontWeight: '700' }, resetButton: { alignItems: 'center', backgroundColor: '#15121F', borderColor: '#15121F', borderRadius: 14, borderWidth: 2.5, padding: 14 }, resetText: { color: '#F5EFDA', fontSize: 15, fontWeight: '800' }, simulator: { backgroundColor: 'rgba(245,239,218,0.45)', borderColor: '#15121F', borderRadius: 14, borderWidth: 2, gap: 10, padding: 16 }, simulatorTitle: { color: '#15121F', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }, simulatorHint: { color: 'rgba(21,18,31,0.62)', fontSize: 13 }, simulatorButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, simulatorButton: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 9, borderWidth: 2, paddingHorizontal: 12, paddingVertical: 10 }, simulatorButtonText: { color: '#15121F', fontSize: 13, fontWeight: '800' },
});
