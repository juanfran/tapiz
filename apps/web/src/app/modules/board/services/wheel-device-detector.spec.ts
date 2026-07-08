import { afterEach, describe, expect, it, vi } from 'vitest';
import { WheelDeviceDetector } from './wheel-device-detector';

function wheelEvent({
  deltaX = 0,
  deltaY,
  deltaMode = WheelEvent.DOM_DELTA_PIXEL,
  ctrlKey = false,
}: {
  deltaX?: number;
  deltaY: number;
  deltaMode?: number;
  ctrlKey?: boolean;
}) {
  return new WheelEvent('wheel', {
    ctrlKey,
    deltaMode,
    deltaX,
    deltaY,
  });
}

describe('WheelDeviceDetector', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('waits for three samples before classifying a device', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(110);
    const detector = new WheelDeviceDetector();

    expect(detector.handleWheel(wheelEvent({ deltaY: 4 })).device).toBe(
      'unknown',
    );
    expect(detector.handleWheel(wheelEvent({ deltaY: 6 })).device).toBe(
      'unknown',
    );
  });

  it('classifies rapid small pixel deltas as trackpad input', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(110)
      .mockReturnValueOnce(120);
    const detector = new WheelDeviceDetector();

    detector.handleWheel(wheelEvent({ deltaY: 4 }));
    detector.handleWheel(wheelEvent({ deltaX: 2, deltaY: 6 }));
    const result = detector.handleWheel(wheelEvent({ deltaX: 3, deltaY: 8 }));

    expect(result.device).toBe('trackpad');
    expect(result.confidence).toBeGreaterThan(0.25);
  });

  it('classifies repeated line deltas as mouse input', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(200)
      .mockReturnValueOnce(300);
    const detector = new WheelDeviceDetector();

    detector.handleWheel(
      wheelEvent({ deltaY: 100, deltaMode: WheelEvent.DOM_DELTA_LINE }),
    );
    detector.handleWheel(
      wheelEvent({ deltaY: 100, deltaMode: WheelEvent.DOM_DELTA_LINE }),
    );
    const result = detector.handleWheel(
      wheelEvent({ deltaY: 100, deltaMode: WheelEvent.DOM_DELTA_LINE }),
    );

    expect(result.device).toBe('mouse');
    expect(result.confidence).toBeGreaterThan(0.25);
  });

  it('classifies repeated scaled vertical pixel deltas (mouse wheel) as mouse input', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(160)
      .mockReturnValueOnce(220);
    const detector = new WheelDeviceDetector();

    detector.handleWheel(wheelEvent({ deltaY: 133.33 }));
    detector.handleWheel(wheelEvent({ deltaY: 133.33 }));
    const result = detector.handleWheel(wheelEvent({ deltaY: 133.33 }));

    expect(result.device).toBe('mouse');
    expect(result.confidence).toBeGreaterThan(0.25);
  });

  it('starts a fresh sample after a long pause', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(110)
      .mockReturnValueOnce(120)
      .mockReturnValueOnce(1000);
    const detector = new WheelDeviceDetector();

    detector.handleWheel(wheelEvent({ deltaY: 4 }));
    detector.handleWheel(wheelEvent({ deltaY: 6 }));
    expect(detector.handleWheel(wheelEvent({ deltaY: 8 })).device).toBe(
      'trackpad',
    );

    expect(detector.handleWheel(wheelEvent({ deltaY: 100 })).device).toBe(
      'unknown',
    );
  });

  it('notifies only when a conclusive device changes', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(200)
      .mockReturnValueOnce(300)
      .mockReturnValueOnce(1200)
      .mockReturnValueOnce(1210)
      .mockReturnValueOnce(1220);
    const onChange = vi.fn();
    const detector = new WheelDeviceDetector({ onChange });

    detector.handleWheel(
      wheelEvent({ deltaY: 100, deltaMode: WheelEvent.DOM_DELTA_LINE }),
    );
    detector.handleWheel(
      wheelEvent({ deltaY: 100, deltaMode: WheelEvent.DOM_DELTA_LINE }),
    );
    detector.handleWheel(
      wheelEvent({ deltaY: 100, deltaMode: WheelEvent.DOM_DELTA_LINE }),
    );
    detector.handleWheel(wheelEvent({ deltaX: 2, deltaY: 4 }));
    detector.handleWheel(wheelEvent({ deltaX: 3, deltaY: 6 }));
    detector.handleWheel(wheelEvent({ deltaX: 4, deltaY: 8 }));

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls.map(([result]) => result.device)).toEqual([
      'mouse',
      'trackpad',
    ]);
  });
});
