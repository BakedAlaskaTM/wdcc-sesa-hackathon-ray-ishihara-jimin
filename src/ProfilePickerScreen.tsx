import { Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

export const demoProfiles = ['Devin', 'Ray', 'Jimin', 'Nicole', 'Simon', 'Nikhil', 'Richard'] as const;
export type DemoProfile = (typeof demoProfiles)[number];
const avatarColors = ['#78C9A7', '#F38B8B', '#B6A3E9', '#F8C943'];

export function ProfilePickerScreen({ onSelect }: { onSelect: (profile: DemoProfile) => void }) {
  const isWeb = Platform.OS === 'web';
  return <SafeAreaView style={[styles.safeArea, isWeb && styles.webCanvas]}><StatusBar backgroundColor="#FFF9E8" barStyle="dark-content" /><View style={[styles.content, isWeb && styles.phoneFrame]}><View><Text style={styles.eyebrow}>WHO’S GOT THIS PHONE?</Text><Text style={styles.title}>pick your profile.</Text><Text style={styles.subtitle}>We’ll track your moments and make the bill fair.</Text></View><View style={styles.profileList}>{demoProfiles.map((profile, index) => <Pressable key={profile} onPress={() => onSelect(profile)} style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}><View style={[styles.avatar, { backgroundColor: avatarColors[index % avatarColors.length] }]}><Text style={styles.avatarText}>{profile[0]}</Text></View><Text style={styles.profileName}>{profile}</Text><Text style={styles.chevron}>›</Text></Pressable>)}</View></View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#EFEAF9', flex: 1 }, webCanvas: { backgroundColor: '#F6F1E8' }, phoneFrame: { alignSelf: 'center', backgroundColor: '#EFEAF9', borderColor: '#383342', borderLeftWidth: 2, borderRightWidth: 2, maxWidth: '100%', minHeight: '100%', width: 390 }, content: { flex: 1, justifyContent: 'center', padding: 26 }, eyebrow: { color: '#77717B', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 }, title: { color: '#383342', fontSize: 27, fontWeight: '900', letterSpacing: -1, lineHeight: 31, marginTop: 3 }, subtitle: { color: '#77717B', fontSize: 11, lineHeight: 16, marginTop: 4 }, profileList: { gap: 8, marginTop: 20 }, profileButton: { alignItems: 'center', backgroundColor: '#FFFCF2', borderColor: '#57505D', borderRadius: 10, borderWidth: 1.5, flexDirection: 'row', minHeight: 42, paddingHorizontal: 10 }, avatar: { alignItems: 'center', borderColor: '#57505D', borderRadius: 6, borderWidth: 1, height: 23, justifyContent: 'center', width: 23 }, avatarText: { color: '#383342', fontSize: 11, fontWeight: '900' }, profileName: { color: '#383342', flex: 1, fontSize: 12, fontWeight: '800', marginLeft: 9 }, chevron: { color: '#77717B', fontSize: 20, fontWeight: '800', lineHeight: 20 }, pressed: { opacity: 0.8, transform: [{ translateY: 1 }] },
});
