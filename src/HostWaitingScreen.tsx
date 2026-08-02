import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import type { WaitingPlayer } from './LobbyWaitingScreen';
import { LobbyPhysicsStack } from './LobbyPhysicsStack';

type Difficulty = 'Easy' | 'Medium' | 'Hard';
type Props = { lobbyCode: string; lobbyName: string; players: WaitingPlayer[]; hostUserId: string; isStarting: boolean; liftedPhoneCount: number; difficulty: Difficulty; error?: string | null; onBack: () => void; onDifficultyChange: (difficulty: Difficulty) => void; onStart: () => void };

export function HostWaitingScreen({ lobbyCode, lobbyName, players, hostUserId, isStarting, liftedPhoneCount, difficulty, error, onBack, onDifficultyChange, onStart }: Props) {
  const isWeb = Platform.OS === 'web';
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <SafeAreaView style={[styles.safeArea, isWeb && styles.webCanvas]}>
      <StatusBar barStyle="dark-content" backgroundColor="#EFEAF9" />
      <ScrollView contentContainerStyle={[styles.content, isWeb && styles.phoneFrame]} showsVerticalScrollIndicator={false}>
        <View>
          <Pressable accessibilityLabel="Go back" onPress={onBack} style={styles.backButton}><Text style={styles.back}>‹</Text></Pressable>
          <Text numberOfLines={2} style={styles.headline}>{lobbyName || 'wait for the'}</Text>
          <Text style={styles.tagline}><Text style={styles.accent}>stack.</Text></Text>
          <Text style={styles.subtitle}>When everyone's phone is resting, start the shared bill.</Text>
          <Text style={styles.lobbyCode}>LOBBY CODE: {lobbyCode}</Text>
          <Pressable onPress={() => setSettingsOpen((open) => !open)} style={styles.settingsButton}><Text style={styles.settingsButtonText}>⚙ LOBBY SETTINGS</Text><Text style={styles.settingsValue}>{difficulty}</Text></Pressable>
          {settingsOpen ? <View style={styles.settingsPanel}><Text style={styles.settingsLabel}>DIFFICULTY</Text><View style={styles.difficultyRow}>{(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((option) => <Pressable key={option} onPress={() => { onDifficultyChange(option); setSettingsOpen(false); }} style={[styles.difficultyOption, difficulty === option && styles.difficultyOptionSelected]}><Text style={[styles.difficultyText, difficulty === option && styles.difficultyTextSelected]}>{option}</Text></Pressable>)}</View></View> : null}

          <LobbyPhysicsStack players={players} />
          <View style={styles.liftTracker}>
            <View style={[styles.liftDot, liftedPhoneCount === 0 && styles.restingDot]} />
            <View style={styles.trackerCopy}>
              <Text style={styles.liftTitle}>{liftedPhoneCount} phone{liftedPhoneCount === 1 ? '' : 's'} lifted</Text>
              <Text style={styles.liftHint}>{liftedPhoneCount ? 'put them back on the stack' : 'all phones are resting'}</Text>
            </View>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
        <View style={styles.buttonShadow}>
          <Pressable accessibilityRole="button" disabled={isStarting} onPress={onStart} style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}>
            {isStarting ? <ActivityIndicator color="#F5EFDA" /> : <Text style={styles.startText}>START SESSION</Text>}
          </Pressable>
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
  lobbyCode: { color: '#3E4AA0', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 16 },
  settingsButton: { alignItems: 'center', backgroundColor: '#FFFDF9', borderColor: '#15121F', borderRadius: 14, borderWidth: 2, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 13, paddingVertical: 11 },
  settingsButtonText: { color: '#15121F', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  settingsValue: { color: '#3E4AA0', fontSize: 12, fontWeight: '800' },
  settingsPanel: { backgroundColor: '#FFFDF9', borderColor: '#15121F', borderRadius: 14, borderWidth: 2, gap: 10, marginBottom: 12, padding: 13 },
  settingsLabel: { color: '#15121F', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  difficultyRow: { flexDirection: 'row', gap: 7 },
  difficultyOption: { alignItems: 'center', borderColor: '#15121F', borderRadius: 10, borderWidth: 1.5, flex: 1, paddingVertical: 8 },
  difficultyOptionSelected: { backgroundColor: '#3E4AA0' },
  difficultyText: { color: '#15121F', fontSize: 11, fontWeight: '800' },
  difficultyTextSelected: { color: '#F5EFDA' },
  liftTracker: { alignItems: 'center', backgroundColor: '#FFFDF9', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, flexDirection: 'row', gap: 10, marginBottom: 16, padding: 12 },
  liftDot: { backgroundColor: '#E76652', borderColor: '#15121F', borderRadius: 8, borderWidth: 2, height: 16, width: 16 },
  restingDot: { backgroundColor: '#60D9A2' },
  trackerCopy: { flex: 1 },
  liftTitle: { color: '#15121F', fontSize: 13, fontWeight: '800' },
  liftHint: { color: 'rgba(21,18,31,0.6)', fontSize: 11, fontWeight: '600', marginTop: 1 },
  error: { color: '#761C2C', fontSize: 12, fontWeight: '700', marginTop: 8 },
  buttonShadow: { backgroundColor: '#3E4AA0', borderRadius: 20, marginRight: -5, paddingBottom: 5, paddingRight: 5 },
  startButton: { alignItems: 'center', backgroundColor: '#15121F', borderColor: '#15121F', borderRadius: 20, borderWidth: 3, justifyContent: 'center', minHeight: 62, paddingHorizontal: 18, paddingVertical: 17 },
  startButtonPressed: { opacity: 0.86, transform: [{ translateX: 2 }, { translateY: 2 }] },
  startText: { color: '#F5EFDA', fontSize: 15, fontWeight: '800', letterSpacing: 0.45 },
});
