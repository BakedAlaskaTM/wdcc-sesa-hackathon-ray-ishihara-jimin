import { useRef, useState } from 'react';
import { GroupScoreScreen } from './src/GroupScoreScreen';
import { HistoryScreen, type GroupHistory } from './src/HistoryScreen';
import { PhoneUsageBillScreen } from './src/PhoneUsageBillScreen';
import { StackDetectorScreen } from './src/StackDetectorScreen';
import { SessionSummaryScreen } from './src/SessionSummaryScreen';
import type { FinalBillPlayer } from './src/useStackLobby';

export default function App() {
  const [screen, setScreen] = useState<'lobby' | 'history' | 'scores' | 'bill' | 'summary'>('lobby');
  const [selectedGroup, setSelectedGroup] = useState<GroupHistory | null>(null);
  const [gameRoomCode, setGameRoomCode] = useState<string | undefined>();
  const [gamePlayerName, setGamePlayerName] = useState<string | undefined>();
  const [finalPlayers, setFinalPlayers] = useState<FinalBillPlayer[]>([]);
  const playerId = useRef(`player-${Math.random().toString(36).slice(2, 10)}`).current;

  if (screen === 'bill') return <PhoneUsageBillScreen displayName={gamePlayerName} userId={playerId} roomCode={gameRoomCode} onSessionEnded={(players) => { setFinalPlayers(players); setScreen('summary'); }} />;
  if (screen === 'summary') return <SessionSummaryScreen players={finalPlayers} onHome={() => { setFinalPlayers([]); setGameRoomCode(undefined); setGamePlayerName(undefined); setScreen('lobby'); }} />;
  if (screen === 'history') return <HistoryScreen onBack={() => setScreen('lobby')} onOpenGroup={(group) => { setSelectedGroup(group); setScreen('scores'); }} />;
  if (screen === 'scores' && selectedGroup) return <GroupScoreScreen groupName={selectedGroup.name} members={selectedGroup.members} onBack={() => setScreen('history')} />;
  return <StackDetectorScreen userId={playerId} onGameStarted={(roomCode, displayName) => { setGameRoomCode(roomCode); setGamePlayerName(displayName); setScreen('bill'); }} onOpenBill={() => setScreen('bill')} onOpenHistory={() => setScreen('history')} />;
}
