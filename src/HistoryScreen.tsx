import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import type { GroupMember } from './GroupScoreScreen';

export type GroupHistory = { id: string; name: string; lastSession: string; duration: string; members: GroupMember[] };

export const groupHistory: GroupHistory[] = [
  { id: 'ray', name: 'Ray', lastSession: 'Today, 4:20 PM', duration: '42 min', members: [
    { id: '1', name: 'Ray', percentage: 31, color: '#5B7CFA' }, { id: '2', name: 'Jimin', percentage: 21, color: '#53B7A8' }, { id: '3', name: 'Ishihara', percentage: 48, color: '#F0A35E' },
  ] },
  { id: 'study-crew', name: 'Study Crew', lastSession: 'Yesterday, 7:05 PM', duration: '1 hr 15 min', members: [
    { id: '1', name: 'Mia', percentage: 18, color: '#A978E8' }, { id: '2', name: 'Ben', percentage: 44, color: '#5B7CFA' }, { id: '3', name: 'Ray', percentage: 26, color: '#53B7A8' }, { id: '4', name: 'Ana', percentage: 12, color: '#F0A35E' },
  ] },
  { id: 'flatmates', name: 'Flatmates', lastSession: '28 Jul, 8:40 PM', duration: '56 min', members: [
    { id: '1', name: 'Ray', percentage: 44, color: '#5B7CFA' }, { id: '2', name: 'Noah', percentage: 34, color: '#53B7A8' }, { id: '3', name: 'Sophie', percentage: 22, color: '#A978E8' },
  ] },
];

export function HistoryScreen({ onBack, onOpenGroup }: { onBack: () => void; onOpenGroup: (group: GroupHistory) => void }) {
  return <SafeAreaView style={styles.safeArea}><StatusBar barStyle="dark-content" /><View style={styles.header}><Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>‹ Lobby</Text></Pressable><Text style={styles.headerTitle}>History</Text><View style={styles.headerSpacer} /></View><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><Text style={styles.title}>Your groups</Text><Text style={styles.subtitle}>Review the latest phone-lift scores from every group.</Text><View style={styles.list}>{groupHistory.map((group) => <Pressable key={group.id} onPress={() => onOpenGroup(group)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}><View style={styles.cardHeader}><Text style={styles.groupName}>{group.name}</Text><Text style={styles.chevron}>›</Text></View><Text style={styles.session}>{group.lastSession} · {group.duration}</Text><View style={styles.summary}><Text style={styles.members}>{group.members.length} members</Text><Text style={styles.average}>100% allocated</Text></View></Pressable>)}</View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FA' }, header: { alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomColor: '#DCE1E8', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 64, paddingHorizontal: 20 }, back: { color: '#355CFF', fontSize: 16, fontWeight: '700' }, headerTitle: { color: '#1D2733', fontSize: 18, fontWeight: '800' }, headerSpacer: { width: 58 },
  content: { padding: 20, paddingBottom: 40 }, title: { color: '#1D2733', fontSize: 30, fontWeight: '800' }, subtitle: { color: '#687382', fontSize: 15, lineHeight: 22, marginTop: 7 }, list: { gap: 14, marginTop: 26 }, card: { backgroundColor: '#FFFFFF', borderColor: '#E2E6EC', borderRadius: 16, borderWidth: 1, padding: 18 }, pressed: { opacity: 0.65 }, cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, groupName: { color: '#222C38', fontSize: 19, fontWeight: '800' }, chevron: { color: '#7C8795', fontSize: 28 }, session: { color: '#7C8795', fontSize: 13, marginTop: 4 }, summary: { borderTopColor: '#E9EDF2', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 14 }, members: { color: '#687382', fontSize: 13 }, average: { color: '#355CFF', fontSize: 13, fontWeight: '800' },
});
