import { Accelerometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';

export type FaceDownZDirection = 'positive' | 'negative' | 'either';

export type PhoneStackDetectorOptions = {
  /** Called once for each debounced physical impact. The value is Unix time in ms. */
  onShockwave?: (timestamp: number) => void;
  /** Called when a device that was flat/ready stops being flat. */
  onPhoneLifted?: () => void;
  /** Absolute Z gravity required for a flat phone. Default: 0.85g. */
  zGravityThreshold?: number;
  /** Maximum allowed horizontal gravity on either X or Y. Default: 0.25g. */
  horizontalGravityTolerance?: number;
  /** Minimum total acceleration magnitude that counts as an impact. Default: 2.2g. */
  shockwaveThreshold?: number;
  /** Minimum delay between impact callbacks. Default: 1000ms. */
  shockwaveDebounceMs?: number;
  /**
   * Select the gravity sign reported for screen-down on the target device.
   * `either` is useful while calibrating across platforms and matches |Z| checks.
   */
  faceDownZDirection?: FaceDownZDirection;
};

export type PhoneStackDetectorState = {
  isFaceDown: boolean;
  isLifted: boolean;
  lastShockwaveTime: number | null;
  resetDetector: () => void;
};

const UPDATE_INTERVAL_MS = 20;

/**
 * Detects a phone resting flat in a stack and high-G impacts while it is ready.
 * expo-sensors reports acceleration in G-force units, so resting gravity is ~1.0.
 */
export function usePhoneStackDetector(
  options: PhoneStackDetectorOptions = {},
): PhoneStackDetectorState {
  const {
    onShockwave,
    onPhoneLifted,
    zGravityThreshold = 0.85,
    horizontalGravityTolerance = 0.25,
    shockwaveThreshold = 2.2,
    shockwaveDebounceMs = 1000,
    faceDownZDirection = 'either',
  } = options;

  const [isFaceDown, setIsFaceDown] = useState(false);
  const [isLifted, setIsLifted] = useState(false);
  const [lastShockwaveTime, setLastShockwaveTime] = useState<number | null>(null);

  const faceDownRef = useRef(false);
  const lastShockwaveRef = useRef<number | null>(null);
  const callbacksRef = useRef({ onShockwave, onPhoneLifted });

  // Keep callbacks current without re-subscribing to the hardware sensor on every render.
  useEffect(() => {
    callbacksRef.current = { onShockwave, onPhoneLifted };
  }, [onShockwave, onPhoneLifted]);

  const resetDetector = useCallback(() => {
    faceDownRef.current = false;
    lastShockwaveRef.current = null;
    setIsFaceDown(false);
    setIsLifted(false);
    setLastShockwaveTime(null);
  }, []);

  useEffect(() => {
    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
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

      if (nextIsFaceDown !== wasFaceDown) {
        faceDownRef.current = nextIsFaceDown;
        setIsFaceDown(nextIsFaceDown);

        if (wasFaceDown && !nextIsFaceDown) {
          setIsLifted(true);
          callbacksRef.current.onPhoneLifted?.();
        }
      }

      // Vector magnitude combines all three axes: sqrt(x² + y² + z²), in Gs.
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const timestamp = Date.now();
      if (
        wasFaceDown &&
        magnitude > shockwaveThreshold &&
        (lastShockwaveRef.current === null ||
          timestamp - lastShockwaveRef.current >= shockwaveDebounceMs)
      ) {
        lastShockwaveRef.current = timestamp;
        setLastShockwaveTime(timestamp);
        callbacksRef.current.onShockwave?.(timestamp);
      }
    });

    return () => subscription.remove();
  }, [
    faceDownZDirection,
    horizontalGravityTolerance,
    shockwaveDebounceMs,
    shockwaveThreshold,
    zGravityThreshold,
  ]);

  return { isFaceDown, isLifted, lastShockwaveTime, resetDetector };
}
