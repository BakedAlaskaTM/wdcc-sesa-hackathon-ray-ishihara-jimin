import { useEffect, useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import type { FinalBillPlayer } from './useStackLobby';

const names = ['Alex', 'Sam', 'Jordan', 'You'];

export function DemoBillScreen({ onEnd, onHome }: { onEnd: (players: FinalBillPlayer[], activityTimeline: number[]) => void; onHome: () => void }) {
  const [shares, setShares] = useState([28, 22, 31, 19]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // A quiet meal with a few visible shared phone-use moments before live updates begin.
  const [activityTimeline, setActivityTimeline] = useState<number[]>([0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 1, 0, 0, 0]);
  const isWeb = Platform.OS === 'web';
  const restingCount = activeIndex === null ? names.length : names.length - 1;
  useEffect(() => {
    const timer = setInterval(() => {
      setShares((current) => {
        const next = [...current];
        const active = Math.floor(Math.random() * next.length);
        setActiveIndex(active);
        const donor = (active + 1 + Math.floor(Math.random() * (next.length - 1))) % next.length;
        const amount = Math.min(3, next[donor]);
        next[active] += amount;
        next[donor] -= amount;
        return next;
      });
      // Most of a relaxed meal is phone-free; use brief activity bursts for the demo heatmap.
      setActivityTimeline((timeline) => [...timeline, Math.random() < 0.75 ? 0 : 1 + Math.floor(Math.random() * 4)]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const endDemo = () => onEnd(shares.map((billPercent, index) => ({ userId: `demo-${index}`, displayName: names[index], billPercent })), activityTimeline);
  return <SafeAreaView style={styles.safeArea}><StatusBar backgroundColor="#AAB7E9" barStyle="dark-content" /><ScrollView contentContainerStyle={[styles.content, isWeb && styles.phoneFrame]}><Text style={styles.eyebrow}>DEMO MODE</Text><Text style={styles.title}>shared <Text style={styles.accent}>bill</Text></Text><Text style={styles.subtitle}>A simulated group updates every second.</Text><View style={styles.restingCard}><View style={styles.phoneStack}><View style={styles.backPhone} /><View style={styles.frontPhone}><View style={styles.restEyes}><View style={styles.restEye} /><View style={styles.restEye} /></View></View><Text style={styles.zed}>z</Text></View><Text style={styles.restingTitle}>shhh… {restingCount} phones resting</Text><Text style={styles.restingHint}>tap anyone who peeks to nudge them</Text></View><View style={styles.card}><Text style={styles.label}>LIVE SHARES · TOTAL 100%</Text><View style={styles.chart}>{shares.map((share, index) => <View key={names[index]} style={styles.column}><Text style={styles.value}>{share}%</Text><View style={styles.track}><View style={[styles.bar, { height: `${Math.max(2, share)}%`, backgroundColor: activeIndex === index ? '#F0908B' : '#86CBA3' }]} /></View><Text numberOfLines={1} style={styles.name}>{names[index]}</Text></View>)}</View></View><Pressable onPress={endDemo} style={styles.endButton}><Text style={styles.buttonText}>END BILL</Text></Pressable><Pressable onPress={onHome} style={styles.homeButton}><Text style={styles.homeText}>RETURN HOME</Text></Pressable></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  restingCard: { alignItems: 'center', backgroundColor: '#FFFDF9', borderColor: '#2E2A3A', borderRadius: 22, borderWidth: 2, padding: 14 }, phoneStack: { height: 49, marginBottom: 3, position: 'relative', width: 82 }, backPhone: { backgroundColor: '#BFE4CD', borderColor: '#2E2A3A', borderRadius: 10, borderWidth: 2, height: 22, left: 17, position: 'absolute', top: 23, transform: [{ rotate: '-8deg' }], width: 53 }, frontPhone: { alignItems: 'center', backgroundColor: '#86CBA3', borderColor: '#2E2A3A', borderRadius: 12, borderWidth: 2, height: 25, justifyContent: 'center', left: 13, position: 'absolute', top: 10, width: 56 }, restEyes: { flexDirection: 'row', gap: 12 }, restEye: { backgroundColor: '#2E2A3A', borderRadius: 2, height: 3, width: 8 }, zed: { color: '#86CBA3', fontSize: 16, fontWeight: '900', position: 'absolute', right: 4, top: 0 }, restingTitle: { color: '#2E2A3A', fontSize: 15, fontWeight: '800' }, restingHint: { color: 'rgba(46,42,58,.55)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  safeArea: { backgroundColor: '#EFEAF9', flex: 1 }, content: { flexGrow: 1, gap: 18, padding: 26, paddingTop: 52 }, phoneFrame: { alignSelf: 'center', borderColor: '#15121F', borderLeftWidth: 3, borderRightWidth: 3, maxWidth: '100%', minHeight: '100%', width: 390 }, eyebrow: { color: 'rgba(21,18,31,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#15121F', fontSize: 31, fontWeight: '800' }, accent: { color: '#3E4AA0' }, subtitle: { color: 'rgba(21,18,31,0.65)', fontSize: 14, fontWeight: '600', marginTop: -10 }, card: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 20, borderWidth: 2.5, padding: 18 }, label: { color: '#15121F', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, chart: { alignItems: 'flex-end', flexDirection: 'row', gap: 12, height: 220, justifyContent: 'space-between', marginTop: 20 }, column: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }, value: { color: '#15121F', fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '800', marginBottom: 6 }, track: { backgroundColor: 'rgba(21,18,31,0.12)', borderColor: '#15121F', borderRadius: 8, borderWidth: 1, height: 154, justifyContent: 'flex-end', overflow: 'hidden', width: 28 }, bar: { borderRadius: 6, width: '100%' }, name: { color: '#15121F', fontSize: 11, fontWeight: '800', marginTop: 8, textAlign: 'center' }, endButton: { alignItems: 'center', backgroundColor: '#15121F', borderColor: '#15121F', borderRadius: 20, borderWidth: 3, justifyContent: 'center', minHeight: 58 }, homeButton: { alignItems: 'center', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, justifyContent: 'center', minHeight: 52 }, buttonText: { color: '#F5EFDA', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 }, homeText: { color: '#15121F', fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },
});
