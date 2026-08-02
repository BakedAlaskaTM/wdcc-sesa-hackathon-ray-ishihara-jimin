import { type ReactNode, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GroupScoreScreen } from './src/GroupScoreScreen';
import { HistoryScreen, type GroupHistory } from './src/HistoryScreen';
import { PhoneUsageBillScreen } from './src/PhoneUsageBillScreen';
import { StackDetectorScreen } from './src/StackDetectorScreen';
import { SessionSummaryScreen } from './src/SessionSummaryScreen';
import { DemoBillScreen } from './src/DemoBillScreen';
import { MapScreen } from './src/MapScreen';
import { DemoLobbyScreen } from './src/DemoLobbyScreen';
import { ProfilePickerScreen, type DemoProfile } from './src/ProfilePickerScreen';
import { WelcomeScreen } from './src/WelcomeScreen';
import { StatsScreen } from './src/StatsScreen';
import type { FinalBillPlayer } from './src/useStackLobby';
import history from './src/assets/history.json';

type Screen = 'welcome' | 'profile' | 'lobby' | 'history' | 'map' | 'scores' | 'stats' | 'bill' | 'summary' | 'demo' | 'demoLobby';
const allHistory: GroupHistory[] = history;
const historyForProfile = (profile: DemoProfile) => allHistory.filter((group) => group.members.some((member) => member.name === profile));
const formatTimelineTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);
  const [profile, setProfile] = useState<DemoProfile | null>(null);
  const [sessionHistory, setSessionHistory] = useState<GroupHistory[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupHistory | null>(null);
  const [gameRoomCode, setGameRoomCode] = useState<string | undefined>();
  const [gamePlayerName, setGamePlayerName] = useState<string | undefined>();
  const [gameLobbyName, setGameLobbyName] = useState<string | undefined>();
  const [finalPlayers, setFinalPlayers] = useState<FinalBillPlayer[]>([]);
  const [activityTimeline, setActivityTimeline] = useState<number[]>([]);
  const [timelineLabels, setTimelineLabels] = useState<{ start: string; end: string } | null>(null);
  const playerId = useRef(`player-${Math.random().toString(36).slice(2, 10)}`).current;
  const withAppMargins = (content: ReactNode) => <View style={styles.appShell}>{content}</View>;
  const withBackButton = (content: ReactNode, onBack: () => void) => <View style={styles.screenWrap}>{content}<Pressable accessibilityLabel="Go back" hitSlop={10} onPress={onBack} style={styles.backButton}><Text style={styles.backChevron}>‹</Text></Pressable></View>;
  const navigate = (next: Screen) => { setScreenHistory((previous) => [...previous, screen]); setScreen(next); };
  const goBack = () => { const previous = screenHistory.at(-1); if (!previous) return; setScreenHistory((history) => history.slice(0, -1)); setScreen(previous); };
  const returnHome = () => { setFinalPlayers([]); setActivityTimeline([]); setTimelineLabels(null); setGameRoomCode(undefined); setGamePlayerName(undefined); setGameLobbyName(undefined); setScreenHistory([]); setScreen('lobby'); };

  if (screen === 'welcome') return withAppMargins(<WelcomeScreen onStart={() => navigate('profile')} />);
  if (screen === 'profile') return withAppMargins(withBackButton(<ProfilePickerScreen onSelect={(selectedProfile) => { setProfile(selectedProfile); setSessionHistory(historyForProfile(selectedProfile)); navigate('lobby'); }} />, goBack));
  if (screen === 'bill') return withAppMargins(<PhoneUsageBillScreen displayName={gamePlayerName} lobbyName={gameLobbyName} userId={playerId} roomCode={gameRoomCode} onSessionEnded={(players, timeline, timelineRange) => { setFinalPlayers(players); setActivityTimeline(timeline); setTimelineLabels(timelineRange ? { start: formatTimelineTime(timelineRange.startedAt), end: formatTimelineTime(timelineRange.endedAt) } : null); setSessionHistory((previous) => [{ id: `stack-${Date.now()}`, name: gameLobbyName || 'Untitled stack', lastSession: 'Just now', duration: 'This session', pos: '-36.8485, 174.7633', members: players.map((player, index) => ({ id: player.userId, name: player.displayName, percentage: player.billPercent, color: ['#5B7CFA', '#53B7A8', '#F0A35E', '#A978E8'][index % 4] })) }, ...previous]); navigate('summary'); }} />);
  if (screen === 'summary') return withAppMargins(<SessionSummaryScreen activityTimeline={activityTimeline} lobbyName={gameLobbyName} onBack={goBack} onHome={returnHome} paymentUserId={playerId} players={finalPlayers} roomCode={gameRoomCode} timelineLabels={timelineLabels ?? undefined} />);
  if (screen === 'demoLobby') return withAppMargins(<DemoLobbyScreen onBack={goBack} onStart={() => navigate('demo')} />);
  if (screen === 'demo') return withAppMargins(withBackButton(<DemoBillScreen onHome={returnHome} onEnd={(players, timeline) => { setFinalPlayers(players); setActivityTimeline(timeline); setTimelineLabels({ start: '6:14 PM', end: '8:04 PM' }); navigate('summary'); }} />, goBack));
  if (screen === 'history') return withAppMargins(<HistoryScreen groups={sessionHistory} profileName={profile ?? 'Your'} onBack={goBack} onOpenGroup={(group) => { setSelectedGroup(group); navigate('scores'); }} onOpenMap={() => navigate('map')} />);
  if (screen === 'map') return withAppMargins(<MapScreen history={sessionHistory} profileName={profile ?? ''} onBack={goBack} />);
  if (screen === 'scores' && selectedGroup) return withAppMargins(<GroupScoreScreen groupName={selectedGroup.name} members={selectedGroup.members} onBack={goBack} />);
  if (screen === 'stats') return withAppMargins(<StatsScreen onHome={goBack} />);
  return withAppMargins(<StackDetectorScreen userId={playerId} onGameStarted={(roomCode, displayName, lobbyName) => { setGameRoomCode(roomCode); setGamePlayerName(displayName); setGameLobbyName(lobbyName); navigate('bill'); }} onOpenBill={() => navigate('bill')} onOpenDemo={() => navigate('demoLobby')} onOpenHistory={() => navigate('history')} onOpenMap={() => navigate('map')} onOpenStats={() => navigate('stats')} />);
}

const styles = StyleSheet.create({
  appShell: { backgroundColor: '#EFEAF9', flex: 1, paddingBottom: 28, paddingTop: 28 },
  screenWrap: { flex: 1 },
  backButton: { alignItems: 'center', backgroundColor: '#FFFDF9', borderColor: '#2E2A3A', borderRadius: 18, borderWidth: 2, height: 36, justifyContent: 'center', left: 20, position: 'absolute', top: 48, width: 36, zIndex: 50 },
  backChevron: { color: '#2E2A3A', fontSize: 27, fontWeight: '800', lineHeight: 29, marginTop: -3 },
});
