import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { usePhoneStackDetector } from './usePhoneStackDetector';

export function StackDetectorScreen() {
  const { isFaceDown, isLifted, lastShockwaveTime, resetDetector } =
    usePhoneStackDetector({
      onShockwave: (timestamp) => console.log('Shockwave registered:', timestamp),
      onPhoneLifted: () => console.warn('Phone was lifted from the stack'),
      // Use `positive` or `negative` after confirming the gravity sign on your device.
      faceDownZDirection: 'either',
    });

  const status = isLifted
    ? 'WARNING: Phone Lifted!'
    : lastShockwaveTime !== null
      ? 'SHOCKWAVE REGISTERED!'
      : isFaceDown
        ? 'READY ON STACK'
        : 'Place Phone Face Down';

  const statusColor = isLifted ? '#FF6B6B' : isFaceDown ? '#76E5B1' : '#F6C667';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <Text style={styles.eyebrow}>STACK SENSOR</Text>
        <View style={[styles.indicator, { borderColor: statusColor }]}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
        </View>

        <View style={styles.details}>
          <Detail label="Orientation" value={isFaceDown ? 'Face-down / flat' : 'Not ready'} />
          <Detail label="Lift state" value={isLifted ? 'Lift detected' : 'Secure'} />
          <Detail
            label="Last impact"
            value={lastShockwaveTime ? new Date(lastShockwaveTime).toLocaleTimeString() : 'None'}
          />
        </View>

        <Text style={styles.hint}>
          Place the device flat, then tap the surface firmly to test an impact.
        </Text>
        <Pressable onPress={resetDetector} style={styles.button}>
          <Text style={styles.buttonText}>Reset detector</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#10151F' },
  container: { flex: 1, justifyContent: 'center', padding: 28, gap: 28 },
  eyebrow: { color: '#8F9BB3', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  indicator: { alignItems: 'center', borderWidth: 2, borderRadius: 24, padding: 28, gap: 16 },
  dot: { width: 18, height: 18, borderRadius: 9 },
  status: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  details: { backgroundColor: '#1B2331', borderRadius: 18, padding: 18, gap: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  label: { color: '#8F9BB3', fontSize: 15 },
  value: { color: '#F4F7FB', fontSize: 15, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  hint: { color: '#B5C0D4', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { alignItems: 'center', backgroundColor: '#355CFF', borderRadius: 14, paddingVertical: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
