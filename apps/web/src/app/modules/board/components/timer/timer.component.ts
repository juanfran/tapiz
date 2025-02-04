import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NodePatch, Timer } from '@tapiz/board-commons';
import { BoardActions } from '../estimation/estimation.component';
import { Store } from '@ngrx/store';
import { MatIconModule } from '@angular/material/icon';
import { interval } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

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
        1:00
      </button>
      <button
        (click)="increaseTime(60 * 5)"
        type="button"
        mat-button>
        5:00
      </button>
      <button
        (click)="increaseTime(60 * 10)"
        type="button"
        mat-button>
        10:00
      </button>
    </div>

    <div class="timer-controls">
      @if (timer().active) {
        <button
          (click)="setActive(false)"
          type="button"
          color="primary"
          mat-flat-button>
          Stop
        </button>
      } @else {
        <button
          (click)="setActive(true)"
          type="button"
          color="primary"
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

  #remainingSeconds = computed(() => {
    const timer = this.timer();

    if (!timer.remainingTime) {
      return 0;
    }

    if (!timer.active || !timer.startTime) {
      return timer.remainingTime;
    }

    let currentTime = this.currentDateTime();

    // get the latest time
    currentTime = new Date().getTime() / 1000;

    const startTime = new Date(timer.startTime).getTime() / 1000;
    const elapsed = currentTime - startTime;

    return timer.remainingTime - elapsed;
  });

  currentTime = computed(() => {
    const remainingSeconds = this.#remainingSeconds();

    if (remainingSeconds <= 0) {
      return '00:00';
    }

    const minutes = Math.floor(remainingSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor(remainingSeconds % 60)
      .toString()
      .padStart(2, '0');

    return `${minutes}:${seconds}`;
  });

  setActive(active: boolean) {
    this.#send({
      active,
      startTime: new Date().toISOString(),
      remainingTime: this.#remainingSeconds(),
    });
  }

  increaseTime(seconds: number) {
    this.#send({
      remainingTime: this.#remainingSeconds() + seconds,
    });
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
