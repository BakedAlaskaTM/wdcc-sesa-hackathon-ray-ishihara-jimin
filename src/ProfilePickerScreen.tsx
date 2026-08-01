import { Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

export const demoProfiles = ['Devin', 'Ray', 'Jimin', 'Nicole', 'Simon', 'Nikhil', 'Richard'] as const;
export type DemoProfile = (typeof demoProfiles)[number];

export function ProfilePickerScreen({ onSelect }: { onSelect: (profile: DemoProfile) => void }) {
  const isWeb = Platform.OS === 'web';

  return <SafeAreaView style={[styles.safeArea, isWeb && styles.webCanvas]}><StatusBar backgroundColor="#AAB7E9" barStyle="dark-content" /><View style={[styles.content, isWeb && styles.phoneFrame]}><View><Text style={styles.eyebrow}>DEMO SETUP</Text><Text style={styles.title}>pick your <Text style={styles.accent}>profile.</Text></Text><Text style={styles.subtitle}>Choose the person using this phone to load their session history.</Text></View><View style={styles.profileList}>{demoProfiles.map((profile) => <Pressable key={profile} onPress={() => onSelect(profile)} style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}><Text style={styles.profileName}>{profile}</Text><Text style={styles.chevron}>›</Text></Pressable>)}</View></View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#AAB7E9', flex: 1 }, webCanvas: { backgroundColor: '#E9E3D0' }, phoneFrame: { alignSelf: 'center', borderColor: '#15121F', borderLeftWidth: 3, borderRightWidth: 3, maxWidth: '100%', minHeight: '100%', width: 390 }, content: { flex: 1, justifyContent: 'center', padding: 26 }, eyebrow: { color: 'rgba(21,18,31,0.58)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#15121F', fontSize: 32, fontWeight: '800', lineHeight: 37, marginTop: 6 }, accent: { color: '#3E4AA0' }, subtitle: { color: 'rgba(21,18,31,0.65)', fontSize: 14, fontWeight: '600', lineHeight: 21, marginTop: 10 }, profileList: { gap: 10, marginTop: 32 }, profileButton: { alignItems: 'center', backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, flexDirection: 'row', justifyContent: 'space-between', minHeight: 55, paddingHorizontal: 17 }, profileName: { color: '#15121F', fontSize: 17, fontWeight: '800' }, chevron: { color: '#3E4AA0', fontSize: 28, fontWeight: '800', lineHeight: 28 }, pressed: { opacity: 0.85, transform: [{ translateX: 2 }, { translateY: 2 }] },
});
