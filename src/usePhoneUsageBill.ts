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

type Options = { simulatedReading?: AccelerometerMeasurement | null };

const UPDATE_INTERVAL_MS = 20;
const TILTED_Z_LIMIT = 0.82;
const MOTION_DELTA_G = 0.045;
const RECENT_MOTION_MS = 2000;
const INITIAL_BILL_PERCENT = 20;

/**
 * Estimates whether a phone is being used from accelerometer posture and motion.
 * A flat, still phone has gravity almost entirely on Z; a tilted or recently moved
 * phone is treated as in-hand. Accelerometers cannot detect screen touches directly.
 */
export function usePhoneUsageBill({ simulatedReading = null }: Options = {}): PhoneUsageBillState {
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
      if (delta >= MOTION_DELTA_G) lastMotionTimeRef.current = now;
    }
    lastReadingRef.current = { x, y, z, timestamp: now };

    const isTilted = Math.abs(z) < TILTED_Z_LIMIT;
    const recentlyMoved = now - lastMotionTimeRef.current < RECENT_MOTION_MS;
    setIsUsingPhone(isTilted || recentlyMoved);
  }, []);

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
