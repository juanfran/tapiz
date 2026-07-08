import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import {
  AuthUserModel,
  WheelInputMode,
  defaultUserSettings,
} from '@tapiz/board-commons';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../../services/config.service';
import { BoardWheelInputService } from './board-wheel-input.service';

function userWithWheelMode(wheelInputMode: WheelInputMode): AuthUserModel {
  return {
    id: 'user-1',
    name: 'Ada',
    picture: '',
    settings: {
      ...defaultUserSettings,
      wheelInputMode,
    },
  };
}

function wheelEvent({
  deltaX = 0,
  deltaY,
  deltaMode = WheelEvent.DOM_DELTA_PIXEL,
  wheelDelta,
  ctrlKey = false,
}: {
  deltaX?: number;
  deltaY: number;
  deltaMode?: number;
  wheelDelta?: number;
  ctrlKey?: boolean;
}) {
  const event = new WheelEvent('wheel', {
    ctrlKey,
    deltaMode,
    deltaX,
    deltaY,
  });

  if (wheelDelta !== undefined) {
    Object.defineProperty(event, 'wheelDelta', { value: wheelDelta });
  }

  return event;
}

describe('BoardWheelInputService', () => {
  const user = signal<AuthUserModel | null>(userWithWheelMode('auto'));
  const config = { DEMO: false };
  let service: BoardWheelInputService;

  beforeEach(() => {
    localStorage.clear();
    config.DEMO = false;
    user.set(userWithWheelMode('auto'));
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: Store,
          useValue: {
            selectSignal: () => user,
          },
        },
        {
          provide: ConfigService,
          useValue: { config },
        },
      ],
    });
    service = TestBed.inject(BoardWheelInputService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('always zooms wheel events in mouse mode', () => {
    user.set(userWithWheelMode('mouse'));

    expect(service.isZoomEvent(wheelEvent({ deltaX: 4, deltaY: 5 }))).toBe(
      true,
    );
  });

  it('always pans wheel events in trackpad mode', () => {
    user.set(userWithWheelMode('trackpad'));

    expect(
      service.isZoomEvent(
        wheelEvent({
          deltaY: 100,
          deltaMode: WheelEvent.DOM_DELTA_LINE,
          wheelDelta: -120,
        }),
      ),
    ).toBe(false);
  });

  it('zooms pinch (ctrlKey) wheel events even in trackpad mode', () => {
    user.set(userWithWheelMode('trackpad'));

    expect(
      service.isZoomEvent(wheelEvent({ deltaY: 20, ctrlKey: true })),
    ).toBe(true);
  });

  it('uses and persists a local wheel mode in Demo', () => {
    config.DEMO = true;

    service.setDemoMode('trackpad');

    expect(service.mode()).toBe('trackpad');
    expect(
      service.isZoomEvent(
        wheelEvent({
          deltaY: 100,
          deltaMode: WheelEvent.DOM_DELTA_LINE,
          wheelDelta: -120,
        }),
      ),
    ).toBe(false);
    expect(localStorage.getItem('tapiz-demo-wheel-input-mode')).toBe(
      'trackpad',
    );
  });

  it('uses the detector in auto mode', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(110)
      .mockReturnValueOnce(120);

    expect(service.isZoomEvent(wheelEvent({ deltaY: 4 }))).toBe(false);
    expect(service.isZoomEvent(wheelEvent({ deltaX: 2, deltaY: 6 }))).toBe(
      false,
    );
    expect(service.isZoomEvent(wheelEvent({ deltaX: 3, deltaY: 8 }))).toBe(
      false,
    );
    expect(service.detectedDevice()).toBe('trackpad');
  });

  it('uses the current mouse-wheel heuristic while auto is inconclusive', () => {
    vi.spyOn(performance, 'now').mockReturnValue(100);

    expect(
      service.isZoomEvent(wheelEvent({ deltaY: 4, wheelDelta: -120 })),
    ).toBe(true);
  });

  it('uses the current event fallback at the start of a new gesture', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(110)
      .mockReturnValueOnce(120)
      .mockReturnValueOnce(1000);

    service.isZoomEvent(wheelEvent({ deltaY: 4 }));
    service.isZoomEvent(wheelEvent({ deltaX: 2, deltaY: 6 }));
    service.isZoomEvent(wheelEvent({ deltaX: 3, deltaY: 8 }));

    expect(service.detectedDevice()).toBe('trackpad');
    expect(
      service.isZoomEvent(wheelEvent({ deltaY: 4, wheelDelta: -120 })),
    ).toBe(true);
  });

  it('samples each wheel event only once across pan and zoom listeners', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(110);
    const firstEvent = wheelEvent({ deltaX: 2, deltaY: 4 });

    service.isZoomEvent(firstEvent);
    service.isZoomEvent(firstEvent);
    service.isZoomEvent(wheelEvent({ deltaX: 3, deltaY: 6 }));

    expect(service.detectedDevice()).toBe('unknown');
  });
});
