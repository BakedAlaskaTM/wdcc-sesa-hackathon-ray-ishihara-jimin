import { useRef, useState } from 'react';
import { GroupScoreScreen } from './src/GroupScoreScreen';
import { HistoryScreen, type GroupHistory } from './src/HistoryScreen';
import { PhoneUsageBillScreen } from './src/PhoneUsageBillScreen';
import { StackDetectorScreen } from './src/StackDetectorScreen';
import { SessionSummaryScreen } from './src/SessionSummaryScreen';
import { DemoBillScreen } from './src/DemoBillScreen';
import { DemoLobbyScreen } from './src/DemoLobbyScreen';
import { ProfilePickerScreen, type DemoProfile } from './src/ProfilePickerScreen';
import type { FinalBillPlayer } from './src/useStackLobby';
import history from './src/assets/history.json';

const allHistory: GroupHistory[] = history;
const historyForProfile = (profile: DemoProfile) => allHistory.filter((group) => group.members.some((member) => member.name === profile));
const formatTimelineTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function App() {
  const [screen, setScreen] = useState<'profile' | 'lobby' | 'history' | 'scores' | 'bill' | 'summary' | 'demo' | 'demoLobby'>('profile');
  const [profile, setProfile] = useState<DemoProfile | null>(null);
  const [sessionHistory, setSessionHistory] = useState<GroupHistory[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupHistory | null>(null);
  const [gameRoomCode, setGameRoomCode] = useState<string | undefined>();
  const [gamePlayerName, setGamePlayerName] = useState<string | undefined>();
  const [finalPlayers, setFinalPlayers] = useState<FinalBillPlayer[]>([]);
  const [activityTimeline, setActivityTimeline] = useState<number[]>([]);
  const [timelineLabels, setTimelineLabels] = useState<{ start: string; end: string } | null>(null);
  const playerId = useRef(`player-${Math.random().toString(36).slice(2, 10)}`).current;

  if (screen === 'profile') return <ProfilePickerScreen onSelect={(selectedProfile) => { setProfile(selectedProfile); setSessionHistory(historyForProfile(selectedProfile)); setScreen('lobby'); }} />;
  if (screen === 'bill') return <PhoneUsageBillScreen displayName={gamePlayerName} userId={playerId} roomCode={gameRoomCode} onSessionEnded={(players, timeline, timelineRange) => { setFinalPlayers(players); setActivityTimeline(timeline); setTimelineLabels(timelineRange ? { start: formatTimelineTime(timelineRange.startedAt), end: formatTimelineTime(timelineRange.endedAt) } : null); setScreen('summary'); }} />;
  if (screen === 'summary') return <SessionSummaryScreen players={finalPlayers} activityTimeline={activityTimeline} paymentUserId={playerId} roomCode={gameRoomCode} timelineLabels={timelineLabels ?? undefined} onHome={() => { setFinalPlayers([]); setActivityTimeline([]); setTimelineLabels(null); setGameRoomCode(undefined); setGamePlayerName(undefined); setScreen('lobby'); }} />;
  if (screen === 'demoLobby') return <DemoLobbyScreen onBack={() => setScreen('lobby')} onStart={() => setScreen('demo')} />;
  if (screen === 'demo') return <DemoBillScreen onHome={() => setScreen('lobby')} onEnd={(players, timeline) => { setFinalPlayers(players); setActivityTimeline(timeline); setTimelineLabels({ start: '6:14 PM', end: '8:04 PM' }); setScreen('summary'); }} />;
  if (screen === 'history') return <HistoryScreen groups={sessionHistory} profileName={profile ?? 'Your'} onBack={() => setScreen('lobby')} onOpenGroup={(group) => { setSelectedGroup(group); setScreen('scores'); }} />;
  if (screen === 'scores' && selectedGroup) return <GroupScoreScreen groupName={selectedGroup.name} members={selectedGroup.members} onBack={() => setScreen('history')} />;
  return <StackDetectorScreen userId={playerId} onGameStarted={(roomCode, displayName) => { setGameRoomCode(roomCode); setGamePlayerName(displayName); setScreen('bill'); }} onOpenBill={() => setScreen('bill')} onOpenDemo={() => setScreen('demoLobby')} onOpenHistory={() => setScreen('history')} />;
}
