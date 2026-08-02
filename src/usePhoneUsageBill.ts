import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';

export type PhoneUsageBillState = {
  isUsingPhone: boolean;
  billPercent: number;
  activeSeconds: number;
  /** Arms motion detection after the player touches the app. */
  recordScreenInteraction: () => void;
  resetBill: () => void;
};

type Options = {
  simulatedReading?: AccelerometerMeasurement | null;
  /** Minimum reading-to-reading change that counts as movement. */
  motionDeltaThreshold?: number;
};

const UPDATE_INTERVAL_MS = 20;
const INITIAL_BILL_PERCENT = 20;
const MOVEMENT_CONFIRMATION_MS = 1000;
const STILLNESS_GRACE_MS = 180;

/**
 * A player is using their phone only after touching the app and then moving the
 * phone continuously for one second. The moment the phone is still, billing stops.
 */
export function usePhoneUsageBill({ simulatedReading = null, motionDeltaThreshold = 0.012 }: Options = {}): PhoneUsageBillState {
  const [isUsingPhone, setIsUsingPhone] = useState(false);
  const [billPercent, setBillPercent] = useState(INITIAL_BILL_PERCENT);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const lastReadingRef = useRef<AccelerometerMeasurement | null>(null);
  const movementStartedAtRef = useRef<number | null>(null);
  const lastMovementAtRef = useRef(0);
  const interactionArmedRef = useRef(false);

  const recordScreenInteraction = useCallback(() => {
    interactionArmedRef.current = true;
  }, []);

  const processReading = useCallback(({ x, y, z }: AccelerometerMeasurement) => {
    const now = Date.now();
    const previous = lastReadingRef.current;
    lastReadingRef.current = { x, y, z, timestamp: now };
    if (!previous) return;

    const delta = Math.hypot(x - previous.x, y - previous.y, z - previous.z);
    if (delta >= motionDeltaThreshold) {
      lastMovementAtRef.current = now;
      if (movementStartedAtRef.current === null) movementStartedAtRef.current = now;
      setIsUsingPhone(interactionArmedRef.current && now - movementStartedAtRef.current >= MOVEMENT_CONFIRMATION_MS);
      return;
    }

    // Motion samples naturally fluctuate; only call the phone still after a short
    // quiet window rather than resetting the one-second movement confirmation.
    if (now - lastMovementAtRef.current >= STILLNESS_GRACE_MS) {
      movementStartedAtRef.current = null;
      interactionArmedRef.current = false;
      setIsUsingPhone(false);
    }
  }, [motionDeltaThreshold]);

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

  return { isUsingPhone, billPercent, activeSeconds, recordScreenInteraction, resetBill };
}
