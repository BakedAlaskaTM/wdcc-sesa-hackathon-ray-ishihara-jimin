import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import * as Matter from 'matter-js';

const DEMO_NAMES = ['Alex', 'Sam', 'Jordan'];
const STAGE_WIDTH = 320;
const STAGE_HEIGHT = 245;
const PHONE_WIDTH = 246;
const PHONE_HEIGHT = 39;
const PHONE_COLORS = ['#3E4AA0', '#E76652', '#3F9B84', '#8A5AB4'];

type PhonePosition = { x: number; y: number; angle: number };

export function DemoLobbyScreen({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const [players, setPlayers] = useState(['You']);
  const [stackedCount, setStackedCount] = useState(0);
  const [positions, setPositions] = useState<PhonePosition[]>([]);
  const engineRef = useRef(Matter.Engine.create({ gravity: { x: 0, y: 1.15, scale: 0.001 } }));
  const phonesRef = useRef<Matter.Body[]>([]);
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    const engine = engineRef.current;
    const floor = Matter.Bodies.rectangle(STAGE_WIDTH / 2, STAGE_HEIGHT - 7, STAGE_WIDTH + 30, 16, { isStatic: true, friction: 1 });
    const leftWall = Matter.Bodies.rectangle(-8, STAGE_HEIGHT / 2, 16, STAGE_HEIGHT, { isStatic: true });
    const rightWall = Matter.Bodies.rectangle(STAGE_WIDTH + 8, STAGE_HEIGHT / 2, 16, STAGE_HEIGHT, { isStatic: true });
    Matter.World.add(engine.world, [floor, leftWall, rightWall]);
    // The host is already present when the demo lobby is created, so their phone
    // is the first one to fall naturally into the stack.
    const hostPhone = Matter.Bodies.rectangle(STAGE_WIDTH / 2, -PHONE_HEIGHT, PHONE_WIDTH, PHONE_HEIGHT, { chamfer: { radius: 8 }, density: 0.004, friction: 0.92, frictionAir: 0.018, restitution: 0.13 });
    Matter.Body.setAngle(hostPhone, -0.07);
    Matter.World.add(engine.world, hostPhone);
    phonesRef.current.push(hostPhone);
    setStackedCount(1);

    let frameId = 0;
    let previousTime = Date.now();
    const animate = () => {
      const now = Date.now();
      Matter.Engine.update(engine, Math.min(34, now - previousTime));
      previousTime = now;
      setPositions(phonesRef.current.map((phone) => ({ x: phone.position.x, y: phone.position.y, angle: phone.angle })));
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frameId); Matter.Engine.clear(engine); };
  }, []);

  const addPlayer = () => {
    const next = DEMO_NAMES[players.length - 1];
    if (next) setPlayers((current) => [...current, next]);
  };

  const dropNextPhone = () => {
    let nextPlayers = players;
    if (stackedCount >= players.length && players.length < 4) {
      const next = DEMO_NAMES[players.length - 1];
      nextPlayers = [...players, next];
      setPlayers(nextPlayers);
    }
    if (stackedCount >= nextPlayers.length) return;

    const phone = Matter.Bodies.rectangle(
      STAGE_WIDTH / 2 + (Math.random() - 0.5) * 70,
      -PHONE_HEIGHT,
      PHONE_WIDTH,
      PHONE_HEIGHT,
      {
        chamfer: { radius: 8 },
        density: 0.004,
        friction: 0.92,
        frictionAir: 0.018,
        restitution: 0.13,
      },
    );
    Matter.Body.setAngle(phone, (Math.random() - 0.5) * 0.18);
    Matter.World.add(engineRef.current.world, phone);
    phonesRef.current.push(phone);
    setStackedCount((count) => count + 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#AAB7E9" barStyle="dark-content" />
      <ScrollView contentContainerStyle={[styles.content, isWeb && styles.phoneFrame]}>
        <Text style={styles.eyebrow}>DEMO LOBBY</Text>
        <Text style={styles.title}>wait for the <Text style={styles.accent}>stack.</Text></Text>
        <Text style={styles.subtitle}>Invite a few simulated friends, then stack their phones to begin the demo.</Text>

        <View style={styles.stackStage}>
          <Text style={styles.stageLabel}>PHONE STACK</Text>
          <View style={styles.dropArea}>
            {positions.map((position, index) => <View key={players[index]} style={[styles.phone, { backgroundColor: PHONE_COLORS[index % PHONE_COLORS.length], left: position.x - PHONE_WIDTH / 2, top: position.y - PHONE_HEIGHT / 2, transform: [{ rotate: `${position.angle}rad` }] }]}>
              <View style={styles.phoneEdge} />
              <Text style={styles.phoneName}>{players[index]}</Text>
              <View style={styles.camera} />
            </View>)}
          </View>
          <Text style={styles.stageHint}>{stackedCount ? `${stackedCount} phone${stackedCount === 1 ? '' : 's'} stacked with live collision physics.` : 'Tap the stack button to drop the first phone.'}</Text>
        </View>

        {players.length < 4 ? <Pressable onPress={addPlayer} style={styles.secondaryButton}><Text style={styles.secondaryText}>SIMULATE FRIEND JOIN</Text></Pressable> : null}
        <Pressable disabled={stackedCount >= 4} onPress={dropNextPhone} style={[styles.primaryButton, stackedCount >= 4 && styles.disabledButton]}><Text style={[styles.primaryText, stackedCount >= 4 && styles.disabledText]}>{stackedCount >= 4 ? 'STACK COMPLETE' : 'DROP NEXT PHONE ON STACK'}</Text></Pressable>
        {stackedCount > 0 ? <Pressable onPress={onStart} style={styles.startButton}><Text style={styles.startText}>START LIVE BILL DEMO</Text></Pressable> : null}
        <Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backText}>← BACK</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#AAB7E9', flex: 1 }, content: { flexGrow: 1, gap: 17, padding: 26, paddingTop: 52 }, phoneFrame: { alignSelf: 'center', borderColor: '#15121F', borderLeftWidth: 3, borderRightWidth: 3, maxWidth: '100%', minHeight: '100%', width: 390 }, eyebrow: { color: 'rgba(21,18,31,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#15121F', fontSize: 31, fontWeight: '800' }, accent: { color: '#3E4AA0' }, subtitle: { color: 'rgba(21,18,31,0.65)', fontSize: 14, fontWeight: '600', lineHeight: 20, marginTop: -8 }, stackStage: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 18, borderWidth: 2.5, gap: 8, overflow: 'hidden', padding: 16 }, stageLabel: { color: '#15121F', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, dropArea: { height: STAGE_HEIGHT, overflow: 'hidden', position: 'relative', width: STAGE_WIDTH }, phone: { alignItems: 'center', borderColor: '#15121F', borderRadius: 8, borderWidth: 2.5, flexDirection: 'row', height: PHONE_HEIGHT, justifyContent: 'space-between', paddingHorizontal: 14, position: 'absolute', width: PHONE_WIDTH }, phoneEdge: { backgroundColor: '#76E5B1', borderRadius: 3, height: 15, position: 'absolute', right: -7, width: 8 }, phoneName: { color: '#F5EFDA', fontSize: 14, fontWeight: '800', letterSpacing: 1 }, camera: { backgroundColor: '#15121F', borderColor: '#F5EFDA', borderRadius: 5, borderWidth: 1, height: 10, width: 10 }, stageHint: { color: 'rgba(21,18,31,0.62)', fontSize: 12, fontWeight: '600' }, primaryButton: { alignItems: 'center', backgroundColor: '#15121F', borderColor: '#15121F', borderRadius: 17, borderWidth: 2.5, justifyContent: 'center', minHeight: 55 }, primaryText: { color: '#F5EFDA', fontSize: 13, fontWeight: '800', letterSpacing: .5 }, secondaryButton: { alignItems: 'center', borderColor: '#15121F', borderRadius: 15, borderWidth: 2.5, justifyContent: 'center', minHeight: 48 }, secondaryText: { color: '#15121F', fontSize: 12, fontWeight: '800', letterSpacing: .4 }, startButton: { alignItems: 'center', backgroundColor: '#60D9A2', borderColor: '#15121F', borderRadius: 17, borderWidth: 2.5, justifyContent: 'center', minHeight: 55 }, startText: { color: '#15121F', fontSize: 13, fontWeight: '800', letterSpacing: .5 }, disabledButton: { backgroundColor: 'rgba(21,18,31,0.15)' }, disabledText: { color: 'rgba(21,18,31,0.52)' }, backButton: { alignItems: 'center', padding: 10 }, backText: { color: '#15121F', fontSize: 13, fontWeight: '800' },
});
