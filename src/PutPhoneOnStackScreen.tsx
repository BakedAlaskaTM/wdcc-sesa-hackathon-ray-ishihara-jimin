import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

export function PutPhoneOnStackScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#15121F" />
      <View style={styles.content}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.stackIcon}>
          <View style={[styles.phone, styles.phoneBack]} />
          <View style={[styles.phone, styles.phoneMiddle]} />
          <View style={[styles.phone, styles.phoneFront]} />
        </View>
        <Text style={styles.headline}>place your phone in the <Text style={styles.accent}>phone stack</Text>!</Text>
        <Text style={styles.subtext}>Removing your phone will have consequences…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#15121F', flex: 1 },
  content: { alignItems: 'center', flex: 1, gap: 22, justifyContent: 'center', paddingBottom: 40, paddingHorizontal: 26, paddingTop: 40 },
  stackIcon: { height: 116, marginBottom: 2, position: 'relative', width: 116 },
  phone: { borderRadius: 9, height: 84, left: 33, position: 'absolute', top: 16, width: 48 },
  phoneBack: { backgroundColor: '#3E4AA0', transform: [{ translateX: -12 }, { translateY: -12 }, { rotate: '-14deg' }] },
  phoneMiddle: { backgroundColor: '#AAB7E9', transform: [{ rotate: '-1deg' }] },
  phoneFront: { backgroundColor: '#F5EFDA', transform: [{ translateX: 13 }, { translateY: 16 }, { rotate: '13deg' }] },
  headline: { color: '#F5EFDA', fontSize: 26, fontWeight: '800', lineHeight: 30, maxWidth: 300, textAlign: 'center' },
  accent: { color: '#AAB7E9' },
  subtext: { color: 'rgba(245,239,218,0.65)', fontSize: 14, fontWeight: '600', lineHeight: 20, maxWidth: 280, textAlign: 'center' },
});
