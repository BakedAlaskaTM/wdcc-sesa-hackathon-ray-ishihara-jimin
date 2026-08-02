import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LobbyPhysicsStack } from './LobbyPhysicsStack';

export type WaitingPlayer = { userId: string; name: string; isReadyOnStack?: boolean };

export function LobbyWaitingScreen({ lobbyCode, lobbyName, onBack, players, currentUserId, liftedPhoneCount }: { lobbyCode: string; lobbyName: string; onBack: () => void; players: WaitingPlayer[]; currentUserId: string; liftedPhoneCount: number }) {
  const isWeb = Platform.OS === 'web';
  const pulseValues = useRef([new Animated.Value(0.25), new Animated.Value(0.25), new Animated.Value(0.25)]).current;

  useEffect(() => {
    const animations = pulseValues.map((value, index) => Animated.loop(Animated.sequence([
      Animated.delay(index * 200),
      Animated.timing(value, { duration: 400, toValue: 1, useNativeDriver: true }),
      Animated.timing(value, { duration: 400, toValue: 0.25, useNativeDriver: true }),
      Animated.delay((2 - index) * 200),
    ])));
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [pulseValues]);

  return (
    <SafeAreaView style={[styles.safeArea, isWeb && styles.webCanvas]}>
      <StatusBar barStyle="dark-content" backgroundColor="#AAB7E9" />
      <ScrollView contentContainerStyle={[styles.content, isWeb && styles.phoneFrame]} showsVerticalScrollIndicator={false}>
        <View>
          <Pressable accessibilityLabel="Go back" onPress={onBack} style={styles.backButton}><Text style={styles.back}>‹</Text></Pressable>
          <Text numberOfLines={2} style={styles.headline}>{lobbyName || 'wait for the'}</Text>
          <Text style={styles.tagline}><Text style={styles.accent}>stack.</Text></Text>
          <Text style={styles.subtitle}>When everyone's phone is resting, the host can start the shared bill.</Text>

          <View style={styles.pulseRow}>
            {pulseValues.map((opacity, index) => <Animated.View key={index} style={[styles.pulseDot, { opacity }]} />)}
            <Text style={styles.pulseText}>waiting for host to start</Text>
          </View>
          <Text style={styles.lobbyCode}>LOBBY CODE: {lobbyCode}</Text>
          <LobbyPhysicsStack players={players} />
          <View style={styles.liftTracker}>
            <View style={[styles.liftDot, liftedPhoneCount === 0 && styles.restingDot]} />
            <View style={styles.trackerCopy}>
              <Text style={styles.liftTitle}>{liftedPhoneCount} phone{liftedPhoneCount === 1 ? '' : 's'} lifted</Text>
              <Text style={styles.liftHint}>{liftedPhoneCount ? 'put them back on the stack' : 'all phones are resting'}</Text>
            </View>
          </View>
        </View>

        <View accessibilityState={{ disabled: true }} style={styles.waitingButton}>
          <Text style={styles.waitingButtonText}>WAITING FOR HOST…</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#EFEAF9', flex: 1 },
  webCanvas: { backgroundColor: '#EFEAF9' },
  phoneFrame: { alignSelf: 'center', borderColor: '#15121F', borderLeftWidth: 3, borderRightWidth: 3, maxWidth: '100%', minHeight: '100%', width: 390 },
  content: { flexGrow: 1, justifyContent: 'space-between', paddingBottom: 22, paddingHorizontal: 26, paddingTop: 52 },
  backButton: { alignItems: 'center', backgroundColor: '#FFFDF9', borderColor: '#2E2A3A', borderRadius: 18, borderWidth: 2, height: 36, justifyContent: 'center', marginBottom: 20, width: 36 },
  back: { color: '#2E2A3A', fontSize: 27, fontWeight: '800', lineHeight: 29, marginTop: -3 },
  headline: { color: '#15121F', fontSize: 30, fontWeight: '800', lineHeight: 32 },
  tagline: { color: '#15121F', fontSize: 30, fontWeight: '700', lineHeight: 32, marginBottom: 10 },
  accent: { color: '#3E4AA0', fontWeight: '800' },
  subtitle: { color: 'rgba(21,18,31,0.65)', fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 18 },
  pulseRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 22 },
  pulseDot: { backgroundColor: '#15121F', borderRadius: 5, height: 10, width: 10 },
  pulseText: { color: 'rgba(21,18,31,0.6)', flex: 1, fontSize: 12, fontWeight: '700', marginLeft: 4 },
  lobbyCode: { color: '#3E4AA0', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 16 },
  liftTracker: { alignItems: 'center', backgroundColor: '#FFFDF9', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, flexDirection: 'row', gap: 10, marginBottom: 16, padding: 12 },
  liftDot: { backgroundColor: '#E76652', borderColor: '#15121F', borderRadius: 8, borderWidth: 2, height: 16, width: 16 },
  restingDot: { backgroundColor: '#60D9A2' },
  trackerCopy: { flex: 1 },
  liftTitle: { color: '#15121F', fontSize: 13, fontWeight: '800' },
  liftHint: { color: 'rgba(21,18,31,0.6)', fontSize: 11, fontWeight: '600', marginTop: 1 },
  waitingButton: { alignItems: 'center', backgroundColor: 'rgba(21,18,31,0.15)', borderColor: '#15121F', borderRadius: 20, borderWidth: 3, justifyContent: 'center', marginTop: 24, minHeight: 62, paddingHorizontal: 18, paddingVertical: 17 },
  waitingButtonText: { color: 'rgba(21,18,31,0.4)', fontSize: 15, fontWeight: '800', letterSpacing: 0.45 },
});
