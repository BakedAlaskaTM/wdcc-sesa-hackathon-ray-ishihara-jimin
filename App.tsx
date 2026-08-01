import { useState } from 'react';
import { GroupScoreScreen } from './src/GroupScoreScreen';
import { HistoryScreen, type GroupHistory } from './src/HistoryScreen';
import { PhoneUsageBillScreen } from './src/PhoneUsageBillScreen';
import { StackDetectorScreen } from './src/StackDetectorScreen';

export default function App() {
  const [screen, setScreen] = useState<'lobby' | 'history' | 'scores' | 'bill'>('lobby');
  const [selectedGroup, setSelectedGroup] = useState<GroupHistory | null>(null);

  if (screen === 'bill') return <PhoneUsageBillScreen onOpenStack={() => setScreen('lobby')} />;
  if (screen === 'history') return <HistoryScreen onBack={() => setScreen('lobby')} onOpenGroup={(group) => { setSelectedGroup(group); setScreen('scores'); }} />;
  if (screen === 'scores' && selectedGroup) return <GroupScoreScreen groupName={selectedGroup.name} members={selectedGroup.members} onBack={() => setScreen('history')} />;
  return <StackDetectorScreen onOpenBill={() => setScreen('bill')} onOpenHistory={() => setScreen('history')} />;
}
