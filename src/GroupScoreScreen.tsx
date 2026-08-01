import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

export type GroupMember = {
  id: string;
  name: string;
  percentage: number;
  color: string;
};

// Replace this array with scores from the API or app state.
const defaultMembers: GroupMember[] = [
  { id: '1', name: 'Bob Dylan', percentage: 24, color: '#5B7CFA' },
  { id: '2', name: 'Ben Carter', percentage: 26, color: '#53B7A8' },
  { id: '3', name: 'Mia Chen', percentage: 21, color: '#F0A35E' },
  { id: '4', name: 'Ray Patel', percentage: 29, color: '#A978E8' },
];

export function GroupScoreScreen({ groupName = 'Ray', members = defaultMembers, onBack }: { groupName?: string; members?: GroupMember[]; onBack?: () => void }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} onPress={onBack}>
          {({ pressed }) => (
            <View style={[styles.backButton, pressed && styles.pressed]}>
              <Text style={styles.backIcon}>‹</Text>
              <Text style={styles.backText}>Back</Text>
            </View>
          )}
        </Pressable>
        <View style={styles.groupDetails}>
          <Text style={styles.groupLabel}>GROUP</Text>
          <Text style={styles.groupName}>{groupName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Phone use scores</Text>
        <Text style={styles.subtitle}>Each member’s share of the group’s total lifted-phone time. Shares total 100%.</Text>
        <View style={styles.memberList}>
          {members.map((member) => <MemberScore key={member.id} member={member} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MemberScore({ member }: { member: GroupMember }) {
  const percentage = Math.max(0, Math.min(member.percentage, 100));
  return (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={styles.percentage}>{percentage}%</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: member.color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FA' },
  topBar: { minHeight: 72, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DCE1E8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  pressed: { opacity: 0.55 },
  backIcon: { color: '#1D2733', fontSize: 34, lineHeight: 34, marginRight: 5 },
  backText: { color: '#1D2733', fontSize: 16, fontWeight: '600' },
  groupDetails: { alignItems: 'flex-end' },
  groupLabel: { color: '#7C8795', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  groupName: { color: '#1D2733', fontSize: 20, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 40 },
  title: { color: '#1D2733', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#687382', fontSize: 15, lineHeight: 22, marginTop: 8 },
  memberList: { marginTop: 28, gap: 14 },
  memberCard: { padding: 18, borderRadius: 14, backgroundColor: '#FFF', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E6EC' },
  memberHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  memberName: { color: '#222C38', fontSize: 17, fontWeight: '600' },
  percentage: { color: '#222C38', fontSize: 17, fontVariant: ['tabular-nums'], fontWeight: '700' },
  barTrack: { height: 14, width: '100%', overflow: 'hidden', borderRadius: 7, backgroundColor: '#E9EDF2' },
  barFill: { height: '100%', borderRadius: 7 },
});
