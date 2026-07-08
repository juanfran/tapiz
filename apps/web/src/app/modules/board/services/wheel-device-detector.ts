export type WheelDevice = 'unknown' | 'mouse' | 'trackpad';

export interface WheelDeviceScores {
  trackpad: number;
  mouse: number;
}

export interface WheelDeviceResult {
  device: WheelDevice;
  confidence: number;
  scores?: WheelDeviceScores;
  reason?: string;
}

export interface WheelDeviceDetectorOptions {
  sampleSize?: number;
  resetAfterMs?: number;
  onChange?: (result: WheelDeviceResult) => void;
}

interface WheelSample {
  x: number;
  y: number;
  deltaMode: number;
  timeDelta: number;
  ctrlKey: boolean;
}

export class WheelDeviceDetector {
  readonly sampleSize: number;
  readonly resetAfterMs: number;
  readonly onChange: (result: WheelDeviceResult) => void;

  #samples: WheelSample[] = [];
  #currentDevice: WheelDevice = 'unknown';
  #lastEventTime = 0;

  constructor({
    sampleSize = 12,
    resetAfterMs = 800,
    onChange = () => undefined,
  }: WheelDeviceDetectorOptions = {}) {
    this.sampleSize = sampleSize;
    this.resetAfterMs = resetAfterMs;
    this.onChange = onChange;
  }

  get currentDevice(): WheelDevice {
    return this.#currentDevice;
  }

  handleWheel(event: WheelEvent): WheelDeviceResult {
    const now = performance.now();
    const timeDelta = this.#lastEventTime
      ? now - this.#lastEventTime
      : Infinity;

    this.#lastEventTime = now;

    // A long pause indicates the start of a new gesture. Clear the samples and
    // the sticky device so the next gesture is classified from scratch.
    if (timeDelta > this.resetAfterMs) {
      this.#samples = [];
      this.#currentDevice = 'unknown';
    }

    const sample: WheelSample = {
      x: Math.abs(event.deltaX),
      y: Math.abs(event.deltaY),
      deltaMode: event.deltaMode,
      timeDelta,
      ctrlKey: event.ctrlKey,
    };

    this.#samples.push(sample);

    if (this.#samples.length > this.sampleSize) {
      this.#samples.shift();
    }

    const result = this.classify();

    if (result.device !== 'unknown' && result.device !== this.#currentDevice) {
      this.#currentDevice = result.device;
      this.onChange(result);
    }

    return result;
  }

  reset() {
    this.#samples = [];
    this.#currentDevice = 'unknown';
    this.#lastEventTime = 0;
  }

  classify(): WheelDeviceResult {
    if (this.#samples.length < 3) {
      return {
        device: 'unknown',
        confidence: 0,
        reason: 'Not enough samples',
      };
    }

    let trackpadScore = 0;
    let mouseScore = 0;

    const recent = this.#samples;
    const last = recent.at(-1);

    if (!last) {
      return {
        device: 'unknown',
        confidence: 0,
        reason: 'No samples',
      };
    }

    /*
     * 1. Trackpad pinch.
     *
     * In Chromium, Firefox, and some macOS environments, a pinch can appear
     * as a wheel event with ctrlKey enabled. Ctrl + mouse wheel can produce a
     * similar signal, so this is not absolute proof.
     */
    if (last.ctrlKey && last.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
      trackpadScore += 4;
    }

    /*
     * 2. Horizontal movement.
     *
     * Trackpads naturally generate deltaX. Traditional mouse wheels are
     * usually vertical.
     */
    const horizontalSamples = recent.filter((sample) => sample.x > 0.5).length;

    if (horizontalSamples >= 2) {
      trackpadScore += 3;
    } else if (horizontalSamples === 0) {
      // A purely vertical stream is a strong mouse-wheel signal; trackpads
      // almost always leak some horizontal movement.
      mouseScore += 2;
    }

    /*
     * 3. WheelEvent units.
     *
     * deltaMode values are pixels (0), lines (1), or pages (2). Line-mode
     * deltas are a classic mouse wheel. Pixel mode is NOT a trackpad signal:
     * Chromium reports mouse wheels in pixel mode too (often scaled by the OS
     * display factor, e.g. a 120 step arriving as 133.33).
     */
    const lineSamples = recent.filter(
      (sample) => sample.deltaMode === WheelEvent.DOM_DELTA_LINE,
    ).length;

    if (lineSamples > recent.length / 2) {
      mouseScore += 4;
    }

    /*
     * 4. Delta magnitude.
     *
     * Trackpads tend to produce many small values. Mouse wheels tend to
     * produce larger, repetitive jumps.
     */
    const magnitudes = recent
      .map((sample) => Math.max(sample.x, sample.y))
      .filter((value) => value > 0);
    const average =
      magnitudes.reduce((sum, value) => sum + value, 0) /
      Math.max(magnitudes.length, 1);
    const smallDeltaRatio =
      magnitudes.filter((value) => value < 20).length /
      Math.max(magnitudes.length, 1);

    if (average < 15 && smallDeltaRatio > 0.6) {
      trackpadScore += 3;
    }

    if (average > 50) {
      mouseScore += 2;
    }

    /*
     * 5. Event frequency.
     *
     * Trackpad gestures tend to produce a rapid, continuous event sequence.
     */
    const intervals = recent
      .map((sample) => sample.timeDelta)
      .filter((value) => Number.isFinite(value));
    const averageInterval =
      intervals.reduce((sum, value) => sum + value, 0) /
      Math.max(intervals.length, 1);

    if (averageInterval < 35) {
      trackpadScore += 2;
    }

    if (averageInterval > 70) {
      mouseScore += 1;
    }

    /*
     * 6. Repeated values.
     *
     * Many mouse wheels produce the same delta on every step. Trackpad values
     * tend to vary more.
     */
    const roundedValues = magnitudes.map((value) => Math.round(value));
    const uniqueRatio =
      new Set(roundedValues).size / Math.max(roundedValues.length, 1);

    if (uniqueRatio > 0.6) {
      trackpadScore += 1;
    }

    if (uniqueRatio < 0.3) {
      mouseScore += 2;
    }

    const scores: WheelDeviceScores = {
      trackpad: trackpadScore,
      mouse: mouseScore,
    };
    const totalScore = trackpadScore + mouseScore;

    if (totalScore === 0) {
      return {
        device: 'unknown',
        confidence: 0,
        scores,
        reason: 'No conclusive signals',
      };
    }

    const difference = Math.abs(trackpadScore - mouseScore);
    const confidence = difference / totalScore;

    // Avoid changing modes when the signals are too ambiguous.
    if (confidence < 0.25) {
      return {
        device: 'unknown',
        confidence,
        scores,
        reason: 'Ambiguous input',
      };
    }

    return {
      device: trackpadScore > mouseScore ? 'trackpad' : 'mouse',
      confidence,
      scores,
    };
  }
}
