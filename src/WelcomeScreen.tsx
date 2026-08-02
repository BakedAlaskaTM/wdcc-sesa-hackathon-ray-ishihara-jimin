import { Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const isWeb = Platform.OS === 'web';
  return <SafeAreaView style={[styles.safeArea, isWeb && styles.webCanvas]}>
    <StatusBar barStyle="dark-content" backgroundColor="#E5F3EC" />
    <View style={[styles.content, isWeb && styles.phoneFrame]}>
      <View style={styles.hero}>
        <View style={styles.mascot}>
          <View style={styles.mascotAntenna} />
          <View style={styles.phone}>
            <View style={styles.camera} />
            <View style={styles.eyeRow}><View style={styles.eye} /><View style={styles.eye} /></View>
            <View style={styles.smile} />
          </View>
          <View style={styles.mascotHand} />
        </View>
        <Text style={styles.title}>phones down,{"\n"}friends up.</Text>
        <Text style={styles.copy}>Meet Stacky. Pile your phones at dinner — whoever caves and checks theirs covers a little more of the tab.</Text>
      </View>
      <View>
        <Pressable onPress={onStart} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>let&apos;s stack →</Text></Pressable>
        <Text style={styles.note}>got a crew? <Text style={styles.login}>log in</Text></Text>
      </View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#EFEAF9', flex: 1 },
  webCanvas: { backgroundColor: '#F1EEE8' },
  phoneFrame: { alignSelf: 'center', backgroundColor: '#E5F3EC', borderColor: '#292637', borderLeftWidth: 2, borderRightWidth: 2, maxWidth: '100%', minHeight: '100%', width: 390 },
  content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 31, paddingVertical: 43 },
  hero: { alignItems: 'center', marginTop: 77 },
  mascot: { height: 82, marginBottom: 10, position: 'relative', width: 82 },
  phone: { alignItems: 'center', backgroundColor: '#74CDA7', borderColor: '#292637', borderRadius: 17, borderWidth: 2, height: 61, justifyContent: 'center', left: 17, position: 'absolute', top: 12, transform: [{ rotate: '-6deg' }], width: 45 },
  mascotAntenna: { backgroundColor: '#292637', borderRadius: 2, height: 11, left: 39, position: 'absolute', top: 3, transform: [{ rotate: '-6deg' }], width: 2 },
  mascotHand: { backgroundColor: '#74CDA7', borderColor: '#292637', borderRadius: 8, borderWidth: 2, height: 13, position: 'absolute', right: 3, top: 42, width: 13 },
  camera: { backgroundColor: '#292637', borderRadius: 4, height: 7, left: 7, position: 'absolute', top: 8, width: 7 },
  eyeRow: { flexDirection: 'row', gap: 10, marginTop: 7 },
  eye: { backgroundColor: '#292637', borderRadius: 3, height: 5, width: 5 },
  smile: { borderBottomColor: '#EF8E92', borderBottomWidth: 2, borderRadius: 8, height: 7, marginTop: 4, width: 13 },
  title: { color: '#292637', fontSize: 31, fontWeight: '900', letterSpacing: -1.2, lineHeight: 33, marginTop: 3, textAlign: 'center' },
  copy: { color: '#676674', fontSize: 11, lineHeight: 15, marginTop: 13, maxWidth: 255, textAlign: 'center' },
  button: { alignItems: 'center', backgroundColor: '#FFD04D', borderColor: '#292637', borderRadius: 18, borderWidth: 2, justifyContent: 'center', minHeight: 47, shadowColor: '#292637', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  buttonText: { color: '#292637', fontSize: 13, fontWeight: '900' },
  note: { color: '#77717B', fontSize: 9, marginTop: 12, textAlign: 'center' },
  login: { color: '#4A4994', fontWeight: '800' },
  pressed: { transform: [{ translateY: 2 }], shadowOpacity: 0 },
});
