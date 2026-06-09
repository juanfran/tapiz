import { describe, expect, it } from 'vitest';
import {
  buildTimerActivePatch,
  buildTimerIncreasePatch,
  formatTimerTime,
  getTimerRemainingSeconds,
  isTimerRunning,
} from './timer.component';

describe('timer helpers', () => {
  it('treats an expired active timer as stopped', () => {
    const timer = {
      active: true,
      remainingTime: 60,
      startTime: '2026-01-01T00:00:00.000Z',
    };
    const now = new Date('2026-01-01T00:01:05.000Z');

    expect(getTimerRemainingSeconds(timer, now)).toBe(0);
    expect(formatTimerTime(getTimerRemainingSeconds(timer, now))).toBe(
      '00:00',
    );
    expect(isTimerRunning(timer, now)).toBe(false);
  });

  it('does not show more than the selected duration when startTime is slightly ahead', () => {
    const timer = {
      active: true,
      remainingTime: 60,
      startTime: '2026-01-01T00:00:00.500Z',
    };
    const now = new Date('2026-01-01T00:00:00.000Z');

    expect(getTimerRemainingSeconds(timer, now)).toBe(60);
    expect(formatTimerTime(getTimerRemainingSeconds(timer, now))).toBe(
      '01:00',
    );
  });

  it('adds time from zero after an active timer has expired', () => {
    const timer = {
      active: true,
      remainingTime: 60,
      startTime: '2026-01-01T00:00:00.000Z',
    };
    const now = new Date('2026-01-01T00:01:05.000Z');

    expect(buildTimerIncreasePatch(timer, 60, now)).toEqual({
      active: false,
      remainingTime: 60,
    });
  });

  it('keeps the selected remaining time when adding time while running', () => {
    const timer = {
      active: true,
      remainingTime: 60,
      startTime: '2026-01-01T00:00:00.000Z',
    };
    const now = new Date('2026-01-01T00:00:10.000Z');

    expect(buildTimerIncreasePatch(timer, 60, now)).toEqual({
      active: true,
      remainingTime: 110,
      startTime: '2026-01-01T00:00:10.000Z',
    });
  });

  it('never dispatches a negative remaining time when stopping an expired timer', () => {
    const timer = {
      active: true,
      remainingTime: 60,
      startTime: '2026-01-01T00:00:00.000Z',
    };
    const now = new Date('2026-01-01T00:01:05.000Z');

    expect(buildTimerActivePatch(timer, false, now)).toEqual({
      active: false,
      remainingTime: 0,
    });
  });

  it('does not start without a selected duration', () => {
    expect(buildTimerActivePatch({}, true)).toEqual({
      active: false,
      remainingTime: 0,
    });
  });
});
