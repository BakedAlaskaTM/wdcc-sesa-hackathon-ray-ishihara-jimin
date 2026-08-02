import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Matter from 'matter-js';

const STAGE_WIDTH = 320;
const STAGE_HEIGHT = 180;
const PHONE_WIDTH = 246;
const PHONE_HEIGHT = 36;
const PHONE_COLORS = ['#3E4AA0', '#E76652', '#3F9B84', '#8A5AB4'];

type Player = { userId: string; name: string; isReadyOnStack?: boolean };
type Position = { x: number; y: number; angle: number };

export function LobbyPhysicsStack({ players }: { players: Player[] }) {
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const engineRef = useRef<Matter.Engine | null>(null);
  const phonesRef = useRef(new Map<string, Matter.Body>());
  const colorsRef = useRef(new Map<string, number>());
  const nextColorRef = useRef(0);
  const playersKey = players.map((player) => player.userId).join('|');

  useEffect(() => {
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.15, scale: 0.001 } });
    engineRef.current = engine;
    const floor = Matter.Bodies.rectangle(STAGE_WIDTH / 2, STAGE_HEIGHT - 7, STAGE_WIDTH + 30, 16, { isStatic: true, friction: 1 });
    const leftWall = Matter.Bodies.rectangle(-8, STAGE_HEIGHT / 2, 16, STAGE_HEIGHT, { isStatic: true });
    const rightWall = Matter.Bodies.rectangle(STAGE_WIDTH + 8, STAGE_HEIGHT / 2, 16, STAGE_HEIGHT, { isStatic: true });
    Matter.World.add(engine.world, [floor, leftWall, rightWall]);
    let frameId = 0;
    let previousTime = Date.now();
    const animate = () => {
      const now = Date.now();
      Matter.Engine.update(engine, Math.min(34, now - previousTime));
      previousTime = now;
      const nextPositions: Record<string, Position> = {};
      phonesRef.current.forEach((phone, userId) => {
        nextPositions[userId] = { x: phone.position.x, y: phone.position.y, angle: phone.angle };
      });
      setPositions(nextPositions);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frameId);
      Matter.Engine.clear(engine);
      phonesRef.current.clear();
      colorsRef.current.clear();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const playerIds = new Set(players.map((player) => player.userId));

    phonesRef.current.forEach((phone, userId) => {
      if (!playerIds.has(userId)) {
        Matter.World.remove(engine.world, phone);
        phonesRef.current.delete(userId);
        colorsRef.current.delete(userId);
      }
    });

    players.forEach((player, index) => {
      if (phonesRef.current.has(player.userId)) return;
      const phone = Matter.Bodies.rectangle(
        STAGE_WIDTH / 2 + (index % 2 ? 22 : -22),
        -PHONE_HEIGHT,
        PHONE_WIDTH,
        PHONE_HEIGHT,
        { chamfer: { radius: 8 }, density: 0.004, friction: 0.92, frictionAir: 0.018, restitution: 0.13 },
      );
      Matter.Body.setAngle(phone, (index % 2 ? 1 : -1) * 0.06);
      Matter.World.add(engine.world, phone);
      phonesRef.current.set(player.userId, phone);
      colorsRef.current.set(player.userId, nextColorRef.current % PHONE_COLORS.length);
      nextColorRef.current += 1;
    });
  }, [players, playersKey]);

  return (
    <View style={styles.stage}>
      <Text style={styles.label}>PHONE STACK</Text>
      <View style={styles.dropArea}>
        {players.map((player) => {
          const position = positions[player.userId];
          if (!position) return null;
          return <View key={player.userId} style={[styles.phone, { backgroundColor: PHONE_COLORS[colorsRef.current.get(player.userId) ?? 0], left: position.x - PHONE_WIDTH / 2, top: position.y - PHONE_HEIGHT / 2, transform: [{ rotate: `${position.angle}rad` }] }]}><Text numberOfLines={1} style={styles.phoneName}>{player.name}</Text><View style={[styles.statusDot, player.isReadyOnStack ? styles.restingDot : styles.liftedDot]} /><View style={styles.camera} /></View>;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 18, borderWidth: 2.5, gap: 8, marginBottom: 12, overflow: 'hidden', padding: 14 },
  label: { color: '#15121F', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  dropArea: { height: STAGE_HEIGHT, overflow: 'hidden', position: 'relative', width: STAGE_WIDTH },
  phone: { alignItems: 'center', borderColor: '#15121F', borderRadius: 8, borderWidth: 2.5, flexDirection: 'row', height: PHONE_HEIGHT, justifyContent: 'space-between', paddingHorizontal: 14, position: 'absolute', width: PHONE_WIDTH },
  phoneName: { color: '#F5EFDA', fontSize: 13, fontWeight: '800', letterSpacing: 0.6 },
  statusDot: { borderColor: '#15121F', borderRadius: 6, borderWidth: 1.5, height: 12, marginLeft: 'auto', marginRight: 10, width: 12 },
  restingDot: { backgroundColor: '#60D9A2' },
  liftedDot: { backgroundColor: '#E76652' },
  camera: { backgroundColor: '#15121F', borderColor: '#F5EFDA', borderRadius: 5, borderWidth: 1, height: 10, width: 10 },
});
