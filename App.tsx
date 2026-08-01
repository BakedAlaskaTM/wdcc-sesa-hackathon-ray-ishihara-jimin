import { useRef, useState } from 'react';
import { GroupScoreScreen } from './src/GroupScoreScreen';
import { HistoryScreen, type GroupHistory } from './src/HistoryScreen';
import { PhoneUsageBillScreen } from './src/PhoneUsageBillScreen';
import { StackDetectorScreen } from './src/StackDetectorScreen';
import { SessionSummaryScreen } from './src/SessionSummaryScreen';
import { DemoBillScreen } from './src/DemoBillScreen';
import { ProfilePickerScreen, type DemoProfile } from './src/ProfilePickerScreen';
import type { FinalBillPlayer } from './src/useStackLobby';
import history from './src/assets/history.json';

const allHistory: GroupHistory[] = history;
const historyForProfile = (profile: DemoProfile) => allHistory.filter((group) => group.members.some((member) => member.name === profile));

export default function App() {
  const [screen, setScreen] = useState<'profile' | 'lobby' | 'history' | 'scores' | 'bill' | 'summary' | 'demo'>('profile');
  const [profile, setProfile] = useState<DemoProfile | null>(null);
  const [sessionHistory, setSessionHistory] = useState<GroupHistory[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupHistory | null>(null);
  const [gameRoomCode, setGameRoomCode] = useState<string | undefined>();
  const [gamePlayerName, setGamePlayerName] = useState<string | undefined>();
  const [finalPlayers, setFinalPlayers] = useState<FinalBillPlayer[]>([]);
  const playerId = useRef(`player-${Math.random().toString(36).slice(2, 10)}`).current;

  if (screen === 'profile') return <ProfilePickerScreen onSelect={(selectedProfile) => { setProfile(selectedProfile); setSessionHistory(historyForProfile(selectedProfile)); setScreen('lobby'); }} />;
  if (screen === 'bill') return <PhoneUsageBillScreen displayName={gamePlayerName} userId={playerId} roomCode={gameRoomCode} onSessionEnded={(players) => { setFinalPlayers(players); setScreen('summary'); }} />;
  if (screen === 'summary') return <SessionSummaryScreen players={finalPlayers} onHome={() => { setFinalPlayers([]); setGameRoomCode(undefined); setGamePlayerName(undefined); setScreen('lobby'); }} />;
  if (screen === 'demo') return <DemoBillScreen onHome={() => setScreen('lobby')} onEnd={(players) => { setFinalPlayers(players); setScreen('summary'); }} />;
  if (screen === 'history') return <HistoryScreen groups={sessionHistory} profileName={profile ?? 'Your'} onBack={() => setScreen('lobby')} onOpenGroup={(group) => { setSelectedGroup(group); setScreen('scores'); }} />;
  if (screen === 'scores' && selectedGroup) return <GroupScoreScreen groupName={selectedGroup.name} members={selectedGroup.members} onBack={() => setScreen('history')} />;
  return <StackDetectorScreen userId={playerId} onGameStarted={(roomCode, displayName) => { setGameRoomCode(roomCode); setGamePlayerName(displayName); setScreen('bill'); }} onOpenBill={() => setScreen('bill')} onOpenDemo={() => setScreen('demo')} onOpenHistory={() => setScreen('history')} />;
}
