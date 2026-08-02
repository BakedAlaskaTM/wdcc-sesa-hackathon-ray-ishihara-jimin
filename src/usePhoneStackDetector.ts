import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';

export type FaceDownZDirection = 'positive' | 'negative' | 'either';
export type PhoneStackDetectorOptions = {
  onScreenInteraction?: () => void;
  onShockwave?: (timestamp: number) => void;
  onPhoneLifted?: () => void;
  zGravityThreshold?: number;
  horizontalGravityTolerance?: number;
  shockwaveThreshold?: number;
  shockwaveDebounceMs?: number;
  faceDownZDirection?: FaceDownZDirection;
  simulatedReading?: AccelerometerMeasurement | null;
  enabled?: boolean;
};
export type PhoneStackDetectorState = {
  isFaceDown: boolean;
  isLifted: boolean;
  lastShockwaveTime: number | null;
  hasScreenInteraction: boolean;
  recordScreenInteraction: () => void;
  resetDetector: () => void;
};

const UPDATE_INTERVAL_MS = 20;

export function usePhoneStackDetector(options: PhoneStackDetectorOptions = {}): PhoneStackDetectorState {
  const { onScreenInteraction, onShockwave, onPhoneLifted, zGravityThreshold = 0.85, horizontalGravityTolerance = 0.25, shockwaveThreshold = 2.2, shockwaveDebounceMs = 1000, faceDownZDirection = 'either', simulatedReading = null, enabled = true } = options;
  const [isFaceDown, setIsFaceDown] = useState(false);
  const [isLifted, setIsLifted] = useState(false);
  const [lastShockwaveTime, setLastShockwaveTime] = useState<number | null>(null);
  const [hasScreenInteraction, setHasScreenInteraction] = useState(false);
  const faceDownRef = useRef(false);
  const screenInteractionRef = useRef(false);
  const lastShockwaveRef = useRef<number | null>(null);
  const callbacksRef = useRef({ onScreenInteraction, onShockwave, onPhoneLifted });

  useEffect(() => { callbacksRef.current = { onScreenInteraction, onShockwave, onPhoneLifted }; }, [onPhoneLifted, onScreenInteraction, onShockwave]);
  const resetDetector = useCallback(() => { faceDownRef.current = false; screenInteractionRef.current = false; lastShockwaveRef.current = null; setIsFaceDown(false); setIsLifted(false); setLastShockwaveTime(null); setHasScreenInteraction(false); }, []);
  const recordScreenInteraction = useCallback(() => {
    if (!enabled || !faceDownRef.current || screenInteractionRef.current) return;
    screenInteractionRef.current = true; setHasScreenInteraction(true); callbacksRef.current.onScreenInteraction?.();
  }, [enabled]);
  const processReading = useCallback(({ x, y, z }: AccelerometerMeasurement) => {
    const horizontalIsFlat = Math.abs(x) <= horizontalGravityTolerance && Math.abs(y) <= horizontalGravityTolerance;
    const zIsFaceDown = faceDownZDirection === 'positive' ? z >= zGravityThreshold : faceDownZDirection === 'negative' ? z <= -zGravityThreshold : Math.abs(z) >= zGravityThreshold;
    const nextIsFaceDown = horizontalIsFlat && zIsFaceDown;
    const wasFaceDown = faceDownRef.current;
    if (nextIsFaceDown !== wasFaceDown) {
      faceDownRef.current = nextIsFaceDown; setIsFaceDown(nextIsFaceDown);
      if (wasFaceDown && !nextIsFaceDown) { setIsLifted(true); callbacksRef.current.onPhoneLifted?.(); }
      else if (nextIsFaceDown) setIsLifted(false);
    }
    const timestamp = Date.now();
    if (wasFaceDown && Math.sqrt(x * x + y * y + z * z) > shockwaveThreshold && (lastShockwaveRef.current === null || timestamp - lastShockwaveRef.current >= shockwaveDebounceMs)) {
      lastShockwaveRef.current = timestamp; setLastShockwaveTime(timestamp); callbacksRef.current.onShockwave?.(timestamp);
    }
  }, [faceDownZDirection, horizontalGravityTolerance, shockwaveDebounceMs, shockwaveThreshold, zGravityThreshold]);
  useEffect(() => {
    if (!enabled) return;
    if (simulatedReading) { processReading(simulatedReading); return; }
    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
    const subscription = Accelerometer.addListener(processReading);
    return () => subscription.remove();
  }, [enabled, processReading, simulatedReading]);
  return { isFaceDown, isLifted, lastShockwaveTime, hasScreenInteraction, recordScreenInteraction, resetDetector };
}
