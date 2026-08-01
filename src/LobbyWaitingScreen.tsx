import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

export type WaitingPlayer = { userId: string; name: string };

export function LobbyWaitingScreen({ lobbyCode, onBack, players, currentUserId }: { lobbyCode: string; onBack: () => void; players: WaitingPlayer[]; currentUserId: string }) {
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
          <Pressable onPress={onBack}><Text style={styles.back}>← Back</Text></Pressable>
          <Text style={styles.headline}>hang tight,</Text>
          <Text style={styles.tagline}>friends <Text style={styles.accent}>joining</Text></Text>

          <View style={styles.pulseRow}>
            {pulseValues.map((opacity, index) => <Animated.View key={index} style={[styles.pulseDot, { opacity }]} />)}
            <Text style={styles.pulseText}>waiting for host to start</Text>
          </View>
          <Text style={styles.lobbyCode}>LOBBY CODE: {lobbyCode}</Text>

          <Text style={styles.fieldLabel}>PLAYERS JOINED ({players.length})</Text>
          <View>
            {players.map((player) => {
              const isYou = player.userId === currentUserId;
              return (
                <View key={player.userId} style={styles.playerRow}>
                  <View style={styles.avatar} />
                  <Text numberOfLines={1} style={styles.playerName}>{player.name}</Text>
                  {isYou ? <Text style={styles.youBadge}>YOU</Text> : null}
                </View>
              );
            })}
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
  safeArea: { backgroundColor: '#AAB7E9', flex: 1 },
  webCanvas: { backgroundColor: '#AAB7E9' },
  phoneFrame: { alignSelf: 'center', borderColor: '#15121F', borderLeftWidth: 3, borderRightWidth: 3, maxWidth: '100%', minHeight: '100%', width: 390 },
  content: { flexGrow: 1, justifyContent: 'space-between', paddingBottom: 22, paddingHorizontal: 26, paddingTop: 52 },
  back: { color: '#15121F', fontSize: 13, fontWeight: '800', marginBottom: 20 },
  headline: { color: '#15121F', fontSize: 26, fontWeight: '800', lineHeight: 28 },
  tagline: { color: '#15121F', fontSize: 26, fontWeight: '700', lineHeight: 28, marginBottom: 22 },
  accent: { color: '#3E4AA0', fontWeight: '800' },
  pulseRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 22 },
  pulseDot: { backgroundColor: '#15121F', borderRadius: 5, height: 10, width: 10 },
  pulseText: { color: 'rgba(21,18,31,0.6)', flex: 1, fontSize: 12, fontWeight: '700', marginLeft: 4 },
  lobbyCode: { color: '#3E4AA0', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 16 },
  fieldLabel: { color: '#15121F', fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginBottom: 8 },
  playerRow: { alignItems: 'center', backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, flexDirection: 'row', gap: 12, marginBottom: 10, minHeight: 58, paddingHorizontal: 14, paddingVertical: 10 },
  avatar: { backgroundColor: '#AAB7E9', borderColor: '#15121F', borderRadius: 17, borderWidth: 2, flexShrink: 0, height: 34, width: 34 },
  playerName: { color: '#15121F', flex: 1, fontSize: 13.5, fontWeight: '700', minWidth: 0 },
  youBadge: { backgroundColor: '#15121F', borderRadius: 8, color: '#F5EFDA', flexShrink: 0, fontSize: 8, fontWeight: '700', letterSpacing: 0.65, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3 },
  waitingButton: { alignItems: 'center', backgroundColor: 'rgba(21,18,31,0.15)', borderColor: '#15121F', borderRadius: 20, borderWidth: 3, justifyContent: 'center', marginTop: 24, minHeight: 62, paddingHorizontal: 18, paddingVertical: 17 },
  waitingButtonText: { color: 'rgba(21,18,31,0.4)', fontSize: 15, fontWeight: '800', letterSpacing: 0.45 },
});
