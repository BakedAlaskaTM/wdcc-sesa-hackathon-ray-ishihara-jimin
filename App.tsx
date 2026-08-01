import { useRef, useState } from 'react';
import { GroupScoreScreen } from './src/GroupScoreScreen';
import { HistoryScreen, type GroupHistory } from './src/HistoryScreen';
import { PhoneUsageBillScreen } from './src/PhoneUsageBillScreen';
import { StackDetectorScreen } from './src/StackDetectorScreen';

export default function App() {
  const [screen, setScreen] = useState<'lobby' | 'history' | 'scores' | 'bill'>('lobby');
  const [selectedGroup, setSelectedGroup] = useState<GroupHistory | null>(null);
  const [gameRoomCode, setGameRoomCode] = useState<string | undefined>();
  const [gamePlayerName, setGamePlayerName] = useState<string | undefined>();
  const playerId = useRef(`player-${Math.random().toString(36).slice(2, 10)}`).current;

  if (screen === 'bill') return <PhoneUsageBillScreen displayName={gamePlayerName} userId={playerId} roomCode={gameRoomCode} />;
  if (screen === 'history') return <HistoryScreen onBack={() => setScreen('lobby')} onOpenGroup={(group) => { setSelectedGroup(group); setScreen('scores'); }} />;
  if (screen === 'scores' && selectedGroup) return <GroupScoreScreen groupName={selectedGroup.name} members={selectedGroup.members} onBack={() => setScreen('history')} />;
  return <StackDetectorScreen userId={playerId} onGameStarted={(roomCode, displayName) => { setGameRoomCode(roomCode); setGamePlayerName(displayName); setScreen('bill'); }} onOpenBill={() => setScreen('bill')} onOpenHistory={() => setScreen('history')} />;
}
