import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NodePatch, Timer } from '@tapiz/board-commons';
import { BoardActions } from '../../actions/board.actions';
import { Store } from '@ngrx/store';
import { MatIconModule } from '@angular/material/icon';
import { interval } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

export function getTimerRemainingSeconds(timer: Timer, now = new Date()) {
  const remainingTime = timer.remainingTime ?? 0;

  if (remainingTime <= 0) {
    return 0;
  }

  if (!timer.active || !timer.startTime) {
    return remainingTime;
  }

  const startTime = new Date(timer.startTime).getTime();

  if (Number.isNaN(startTime)) {
    return remainingTime;
  }

  const elapsed = Math.max((now.getTime() - startTime) / 1000, 0);

  return Math.max(remainingTime - elapsed, 0);
}

export function getWholeTimerRemainingSeconds(timer: Timer, now = new Date()) {
  return Math.ceil(getTimerRemainingSeconds(timer, now));
}

export function isTimerRunning(timer: Timer, now = new Date()) {
  return !!timer.active && getTimerRemainingSeconds(timer, now) > 0;
}

export function formatTimerTime(remainingSeconds: number) {
  const wholeRemainingSeconds = Math.ceil(Math.max(remainingSeconds, 0));

  if (wholeRemainingSeconds <= 0) {
    return '00:00';
  }

  const minutes = Math.floor(wholeRemainingSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (wholeRemainingSeconds % 60).toString().padStart(2, '0');

  return `${minutes}:${seconds}`;
}

export function buildTimerActivePatch(
  timer: Timer,
  active: boolean,
  now = new Date(),
): Timer {
  const remainingTime = getWholeTimerRemainingSeconds(timer, now);
  const shouldRun = active && remainingTime > 0;
  const patch: Timer = {
    active: shouldRun,
    remainingTime,
  };

  if (shouldRun) {
    patch.startTime = now.toISOString();
  }

  return patch;
}

export function buildTimerIncreasePatch(
  timer: Timer,
  seconds: number,
  now = new Date(),
): Timer {
  const active = isTimerRunning(timer, now);
  const patch: Timer = {
    active,
    remainingTime: getWholeTimerRemainingSeconds(timer, now) + seconds,
  };

  if (active) {
    patch.startTime = now.toISOString();
  }

  return patch;
}

@Component({
  selector: 'tapiz-timer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  styles: `
    :host {
      display: block;
      background: var(--white);
      border-radius: var(--radius-3);
      border: 1px solid var(--grey-30);
      left: 100px;
      position: fixed;
      bottom: 10px;
      z-index: var(--layer-4);
      padding: var(--spacing-4);
    }

    .header {
      display: flex;
      justify-content: flex-end;
    }

    .time {
      font-size: var(--font-size-8);
      font-weight: var(--font-weight-2);
      text-align: center;
      display: flex;
      justify-content: center;
    }

    .timer-controls {
      display: flex;
      justify-content: center;
      gap: var(--spacing-2);
      margin-block-start: var(--spacing-4);
    }
  `,
  template: `
    <div class="header">
      <button
        type="button"
        aria-label="Close timer"
        (click)="close()">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <div class="time">{{ currentTime() }}</div>

    <div class="timer-times">
      <button
        (click)="increaseTime(60)"
        type="button"
        mat-button>
        +1:00
      </button>
      <button
        (click)="increaseTime(60 * 5)"
        type="button"
        mat-button>
        +5:00
      </button>
      <button
        (click)="increaseTime(60 * 10)"
        type="button"
        mat-button>
        +10:00
      </button>
    </div>

    <div class="timer-controls">
      @if (isRunning()) {
        <button
          (click)="setActive(false)"
          type="button"
          color="primary"
          mat-flat-button>
          Pause
        </button>
      } @else {
        <button
          (click)="setActive(true)"
          type="button"
          color="primary"
          [disabled]="!canStart()"
          mat-flat-button>
          Start
        </button>
      }
      <button
        type="button"
        color="warn"
        (click)="reset()"
        mat-flat-button>
        Reset
      </button>
    </div>
  `,
})
export class TimerComponent {
  #store = inject(Store);

  timer = input.required<Timer>();

  currentDateTime = toSignal(interval(1000));

  #remainingSeconds = computed(() =>
    getTimerRemainingSeconds(this.timer(), this.#getNow()),
  );

  #wholeRemainingSeconds = computed(() =>
    getWholeTimerRemainingSeconds(this.timer(), this.#getNow()),
  );

  isRunning = computed(() => isTimerRunning(this.timer(), this.#getNow()));

  canStart = computed(() => this.#wholeRemainingSeconds() > 0);

  currentTime = computed(() => formatTimerTime(this.#remainingSeconds()));

  setActive(active: boolean) {
    this.#send(buildTimerActivePatch(this.timer(), active));
  }

  increaseTime(seconds: number) {
    this.#send(buildTimerIncreasePatch(this.timer(), seconds));
  }

  #getNow() {
    this.currentDateTime();

    return new Date();
  }

  reset() {
    this.#send({
      active: false,
      startTime: new Date().toISOString(),
      remainingTime: 0,
    });
  }

  close() {
    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: false,
        actions: [
          {
            op: 'remove',
            data: {
              id: 'timer',
              type: 'timer',
            },
          },
        ],
      }),
    );
  }

  #send(timer: Timer) {
    const nodePatch: NodePatch<Timer> = {
      op: 'patch',
      data: {
        id: 'timer',
        type: 'timer',
        content: timer,
      },
    };

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: false,
        actions: [nodePatch],
      }),
    );
  }
}
