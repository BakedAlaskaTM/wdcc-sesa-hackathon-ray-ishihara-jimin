import { useState } from 'react';
import { GroupScoreScreen } from './src/GroupScoreScreen';
import { HistoryScreen, type GroupHistory } from './src/HistoryScreen';
import { StackDetectorScreen } from './src/StackDetectorScreen';

export default function App() {
  const [screen, setScreen] = useState<'lobby' | 'history' | 'scores'>('lobby');
  const [selectedGroup, setSelectedGroup] = useState<GroupHistory | null>(null);
  if (screen === 'history') return <HistoryScreen onBack={() => setScreen('lobby')} onOpenGroup={(group) => { setSelectedGroup(group); setScreen('scores'); }} />;
  if (screen === 'scores' && selectedGroup) return <GroupScoreScreen groupName={selectedGroup.name} members={selectedGroup.members} onBack={() => setScreen('history')} />;
  return <StackDetectorScreen onOpenHistory={() => setScreen('history')} />;
}
