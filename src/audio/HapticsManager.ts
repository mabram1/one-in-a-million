/**
 * Semantic haptics. Callers ask for a MEANING (a UI tick, a collision knock, a
 * success) — never a raw vibration pattern. Uses a native Capacitor Haptics
 * plugin when one is present on the device, otherwise a guarded navigator.vibrate
 * fallback. Short, crisp feedback only — no long buzzy patterns.
 *
 * @capacitor/haptics is NOT a hard dependency (it isn't installed); the plugin is
 * feature-detected at runtime via the global Capacitor bridge, so web/PWA builds
 * and tests never need it.
 */
import type { HapticShape } from './events';

interface NativeHaptics {
  impact?: (opts: { style: string }) => Promise<void> | void;
  notification?: (opts: { type: string }) => Promise<void> | void;
  selectionStart?: () => Promise<void> | void;
  vibrate?: (opts: { duration: number }) => Promise<void> | void;
}

function nativeHaptics(): NativeHaptics | null {
  try {
    const cap = (window as any).Capacitor;
    const h = cap?.Plugins?.Haptics;
    return h && (h.impact || h.notification || h.vibrate) ? (h as NativeHaptics) : null;
  } catch { return null; }
}

/** navigator.vibrate patterns (ms) per semantic shape — short and clear. */
const VIBRATE_PATTERN: Record<HapticShape, number | number[]> = {
  none: 0,
  selection: 8,
  light: 12,
  impact: 18,
  success: [22, 40, 22],   // two crisp pulses
  double: [14, 40, 14],    // short double confirmation
};

export class HapticsManager {
  private enabled = true;
  private reduced = false;
  private native: NativeHaptics | null = null;
  private vibrateFn: ((pattern: number | number[]) => boolean) | null;

  constructor(vibrateFn?: ((pattern: number | number[]) => boolean) | null) {
    this.native = nativeHaptics();
    this.vibrateFn = vibrateFn !== undefined
      ? vibrateFn
      : (typeof navigator !== 'undefined' && navigator.vibrate ? navigator.vibrate.bind(navigator) : null);
  }

  setEnabled(v: boolean): void { this.enabled = v; }
  setReducedIntensity(v: boolean): void { this.reduced = v; }

  /** Trigger a semantic haptic. Returns true if some feedback was dispatched. */
  play(shape: HapticShape): boolean {
    if (!this.enabled || shape === 'none') return false;
    // Reduced intensity collapses multi-pulse shapes to a single light tick.
    const effective: HapticShape = this.reduced && (shape === 'success' || shape === 'double' || shape === 'impact')
      ? 'light'
      : shape;
    if (this.native && this.playNative(effective)) return true;
    return this.playFallback(effective);
  }

  private playNative(shape: HapticShape): boolean {
    const h = this.native; if (!h) return false;
    try {
      switch (shape) {
        case 'selection': (h.selectionStart?.() ?? h.impact?.({ style: 'LIGHT' })); return true;
        case 'light':     (h.impact?.({ style: 'LIGHT' }) ?? h.vibrate?.({ duration: 12 })); return true;
        case 'impact':    (h.impact?.({ style: 'MEDIUM' }) ?? h.vibrate?.({ duration: 18 })); return true;
        case 'success':   (h.notification?.({ type: 'SUCCESS' }) ?? h.impact?.({ style: 'MEDIUM' })); return true;
        case 'double':    (h.notification?.({ type: 'WARNING' }) ?? h.impact?.({ style: 'LIGHT' })); return true;
        default: return false;
      }
    } catch { return false; }
  }

  private playFallback(shape: HapticShape): boolean {
    if (!this.vibrateFn) return false;
    const pattern = VIBRATE_PATTERN[shape];
    if (!pattern || (Array.isArray(pattern) && pattern.length === 0)) return false;
    try { return this.vibrateFn(pattern); } catch { return false; }
  }
}
