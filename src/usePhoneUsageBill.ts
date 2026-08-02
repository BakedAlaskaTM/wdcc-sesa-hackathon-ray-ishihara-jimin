import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';

export type PhoneUsageBillState = {
  /** Heuristic estimate that the phone is currently being held/used. */
  isUsingPhone: boolean;
  /** Share of the bill earned by this phone, capped at 100%. */
  billPercent: number;
  activeSeconds: number;
  resetBill: () => void;
};

type Options = {
  simulatedReading?: AccelerometerMeasurement | null;
  /** Minimum absolute Z gravity for a phone to count as flat. */
  orientationThreshold?: number;
  /** Minimum reading-to-reading change that counts as movement. */
  motionDeltaThreshold?: number;
  /** How long movement keeps the phone marked as in use. */
  recentMotionMs?: number;
};

const UPDATE_INTERVAL_MS = 20;
const INITIAL_BILL_PERCENT = 20;

/**
 * Estimates whether a phone is being used from accelerometer posture and motion.
 * A flat, still phone has gravity almost entirely on Z; a tilted or recently moved
 * phone is treated as in-hand. Accelerometers cannot detect screen touches directly.
 */
export function usePhoneUsageBill({ simulatedReading = null, orientationThreshold = 0.82, motionDeltaThreshold = 0.045, recentMotionMs = 2000 }: Options = {}): PhoneUsageBillState {
  const [isUsingPhone, setIsUsingPhone] = useState(false);
  const [billPercent, setBillPercent] = useState(INITIAL_BILL_PERCENT);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const lastReadingRef = useRef<AccelerometerMeasurement | null>(null);
  const lastMotionTimeRef = useRef(0);

  const processReading = useCallback(({ x, y, z }: AccelerometerMeasurement) => {
    const now = Date.now();
    const previous = lastReadingRef.current;
    if (previous) {
      // Change in the gravity vector indicates the phone was moved in the user's hand.
      const delta = Math.hypot(x - previous.x, y - previous.y, z - previous.z);
      if (delta >= motionDeltaThreshold) lastMotionTimeRef.current = now;
    }
    lastReadingRef.current = { x, y, z, timestamp: now };

    // Gravity close to 1g on Z means the phone is flat.
    const isTilted = Math.abs(z) < orientationThreshold;
    const recentlyMoved = now - lastMotionTimeRef.current < recentMotionMs;
    setIsUsingPhone(isTilted || recentlyMoved);
  }, [motionDeltaThreshold, orientationThreshold, recentMotionMs]);

  useEffect(() => {
    if (simulatedReading) {
      processReading(simulatedReading);
      return;
    }
    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
    const subscription = Accelerometer.addListener(processReading);
    return () => subscription.remove();
  }, [processReading, simulatedReading]);

  useEffect(() => {
    if (!isUsingPhone) return;
    const timer = setInterval(() => {
      setActiveSeconds((seconds) => seconds + 1);
      setBillPercent((percent) => Math.min(100, percent + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isUsingPhone]);

  const resetBill = useCallback(() => {
    setBillPercent(INITIAL_BILL_PERCENT);
    setActiveSeconds(0);
  }, []);

  return { isUsingPhone, billPercent, activeSeconds, resetBill };
}
