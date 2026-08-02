import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';

export type FaceDownZDirection = 'positive' | 'negative' | 'either';

export type PhoneStackDetectorOptions = {
  /** Called once when the user interacts with the screen after the detector is armed. */
  onScreenInteraction?: () => void;
  /** Absolute Z gravity required for a flat phone. Default: 0.85g. */
  zGravityThreshold?: number;
  /** Maximum allowed horizontal gravity on either X or Y. Default: 0.25g. */
  horizontalGravityTolerance?: number;
  /**
   * Select the gravity sign reported for screen-down on the target device.
   * `either` is useful while calibrating across platforms and matches |Z| checks.
   */
  faceDownZDirection?: FaceDownZDirection;
  /** Optional synthetic sample, useful for browser demos and automated tests. */
  simulatedReading?: AccelerometerMeasurement | null;
  /** Start listening only once the player has explicitly armed the sensor. */
  enabled?: boolean;
};

export type PhoneStackDetectorState = {
  isFaceDown: boolean;
  hasScreenInteraction: boolean;
  recordScreenInteraction: () => void;
  resetDetector: () => void;
};

const UPDATE_INTERVAL_MS = 20;

/**
 * Detects when a phone has been placed face down, screen interaction, and
 * high-G impacts. Once placed, physical movement does not invalidate it.
 * expo-sensors reports acceleration in G-force units, so resting gravity is ~1.0.
 */
export function usePhoneStackDetector(
  options: PhoneStackDetectorOptions = {},
): PhoneStackDetectorState {
  const {
    onScreenInteraction,
    zGravityThreshold = 0.85,
    horizontalGravityTolerance = 0.25,
    faceDownZDirection = 'either',
    simulatedReading = null,
    enabled = true,
  } = options;

  const [isFaceDown, setIsFaceDown] = useState(false);
  const [hasScreenInteraction, setHasScreenInteraction] = useState(false);

  const faceDownRef = useRef(false);
  const screenInteractionRef = useRef(false);
  const callbacksRef = useRef({ onScreenInteraction });

  // Keep callbacks current without re-subscribing to the hardware sensor on every render.
  useEffect(() => {
    callbacksRef.current = { onScreenInteraction };
  }, [onScreenInteraction]);

  const resetDetector = useCallback(() => {
    faceDownRef.current = false;
    screenInteractionRef.current = false;
    setIsFaceDown(false);
    setHasScreenInteraction(false);
  }, []);

  const recordScreenInteraction = useCallback(() => {
    if (!enabled || !faceDownRef.current || screenInteractionRef.current) return;
    screenInteractionRef.current = true;
    setHasScreenInteraction(true);
    callbacksRef.current.onScreenInteraction?.();
  }, [enabled]);

  const processReading = useCallback(
    ({ x, y, z }: AccelerometerMeasurement) => {
      // Resting gravity should sit on Z; X/Y near zero means the phone is flat.
      const horizontalIsFlat =
        Math.abs(x) <= horizontalGravityTolerance &&
        Math.abs(y) <= horizontalGravityTolerance;
      const zIsFaceDown =
        faceDownZDirection === 'positive'
          ? z >= zGravityThreshold
          : faceDownZDirection === 'negative'
            ? z <= -zGravityThreshold
            : Math.abs(z) >= zGravityThreshold;
      const nextIsFaceDown = horizontalIsFlat && zIsFaceDown;
      const wasFaceDown = faceDownRef.current;

      // Latch readiness once placed. Movement is allowed by the conceptual
      // "phone stack" rule and therefore cannot invalidate the detector.
      if (nextIsFaceDown && !wasFaceDown) {
        faceDownRef.current = true;
        setIsFaceDown(true);
      }

      // Vector magnitude combines all three axes: sqrt(x² + y² + z²), in Gs.
    },
    [
      faceDownZDirection,
      horizontalGravityTolerance,
      zGravityThreshold,
    ],
  );

  useEffect(() => {
    if (!enabled) return;
    // A supplied synthetic sample deliberately replaces hardware input.
    if (simulatedReading) {
      processReading(simulatedReading);
      return;
    }

    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
    const subscription = Accelerometer.addListener(processReading);

    return () => subscription.remove();
  }, [
    processReading,
    simulatedReading,
    enabled,
  ]);

  return { isFaceDown, hasScreenInteraction, recordScreenInteraction, resetDetector };
}
