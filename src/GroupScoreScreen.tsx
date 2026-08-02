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
const PLACEHOLDER_MEAL_TOTAL = 72;

export function GroupScoreScreen({ groupName = 'Ray', members = defaultMembers, onBack }: { groupName?: string; members?: GroupMember[]; onBack?: () => void }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#AAB7E9" />
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
          <Text numberOfLines={1} style={styles.groupName}>{groupName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={styles.title}>phone use <Text style={styles.accent}>scores</Text></Text>
        <Text style={styles.subtitle}>Each member’s share of the group’s total lifted-phone time. Shares total 100%.</Text>
        <View style={styles.memberList}>
          {members.map((member) => <MemberScore key={member.id} member={member} />)}
        </View>
        <View style={styles.receipt}><Text style={styles.receiptLabel}>MEAL RECEIPT</Text>{members.map((member) => <View key={member.id} style={styles.receiptRow}><Text style={styles.receiptName}>{member.name}</Text><Text style={styles.receiptAmount}>${(PLACEHOLDER_MEAL_TOTAL * member.percentage / 100).toFixed(2)}</Text></View>)}<View style={styles.receiptTotal}><Text style={styles.receiptName}>TOTAL</Text><Text style={styles.receiptAmount}>${PLACEHOLDER_MEAL_TOTAL.toFixed(2)}</Text></View></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MemberScore({ member }: { member: GroupMember }) {
  const percentage = Math.max(0, Math.min(member.percentage, 100));
  return (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <Text numberOfLines={1} style={styles.memberName}>{member.name}</Text>
        <Text style={styles.percentage}>{percentage}%</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: member.color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EFEAF9' },
  topBar: { minHeight: 72, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#AAB7E9', borderBottomWidth: 2, borderBottomColor: '#15121F', flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  backButton: { flexDirection: 'row', alignItems: 'center', minHeight: 44, flexShrink: 0 },
  pressed: { opacity: 0.55 },
  backIcon: { color: '#3E4AA0', fontSize: 34, lineHeight: 34, marginRight: 5 },
  backText: { color: '#3E4AA0', fontSize: 16, fontWeight: '800' },
  groupDetails: { alignItems: 'flex-end', flex: 1, minWidth: 0 },
  groupLabel: { color: 'rgba(21,18,31,0.55)', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  groupName: { color: '#15121F', flexShrink: 1, fontSize: 20, fontWeight: '800', maxWidth: '100%' },
  content: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 40 },
  title: { color: '#15121F', fontSize: 28, fontWeight: '800' }, accent: { color: '#3E4AA0' },
  subtitle: { color: 'rgba(21,18,31,0.62)', fontSize: 14, fontWeight: '600', lineHeight: 21, marginTop: 8 },
  memberList: { marginTop: 28, gap: 14 },
  memberCard: { padding: 16, borderRadius: 18, backgroundColor: '#F5EFDA', borderWidth: 2.5, borderColor: '#15121F' },
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between', marginBottom: 13 },
  memberName: { color: '#15121F', flex: 1, minWidth: 0, fontSize: 17, fontWeight: '700' },
  percentage: { color: '#15121F', flexShrink: 0, fontSize: 17, fontVariant: ['tabular-nums'], fontWeight: '800' },
  barTrack: { height: 14, width: '100%', overflow: 'hidden', borderRadius: 7, backgroundColor: 'rgba(21,18,31,0.14)', borderColor: '#15121F', borderWidth: 1 },
  barFill: { height: '100%', borderRadius: 7 },
  receipt: { backgroundColor: '#E7F4EA', borderColor: '#15121F', borderRadius: 18, borderWidth: 2.5, gap: 9, marginTop: 22, padding: 16 }, receiptLabel: { color: '#15121F', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 5 }, receiptName: { color: '#15121F', fontSize: 14, fontWeight: '700' }, receiptAmount: { color: '#3E4AA0', fontSize: 15, fontVariant: ['tabular-nums'], fontWeight: '800' }, receiptTotal: { borderTopColor: '#15121F', borderTopWidth: 2, flexDirection: 'row', justifyContent: 'space-between', marginTop: 3, paddingTop: 11 },
});
