import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { catchError, firstValueFrom, of, take, timeout } from 'rxjs';
import { describe, expect, it, beforeEach } from 'vitest';
import { ConfigService } from '../../../services/config.service';
import { boardPageFeature } from '../reducers/boardPage.reducer';
import { BoardMoveService } from './board-move.service';

describe('BoardMoveService', () => {
  let service: BoardMoveService;
  let board: HTMLElement;
  let workLayer: HTMLElement;

  beforeEach(() => {
    board = document.createElement('tapiz-board');
    workLayer = document.createElement('div');
    workLayer.classList.add('work-layer');
    board.append(workLayer);
    document.body.append(board);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        BoardMoveService,
        {
          provide: ConfigService,
          useValue: { config: { DEMO: false } },
        },
        provideMockStore({
          selectors: [
            {
              selector: boardPageFeature.selectPosition,
              value: { x: 100, y: 200 },
            },
          ],
        }),
      ],
    });

    service = TestBed.inject(BoardMoveService);
    service.listen(board);
  });

  afterEach(() => {
    board.remove();
  });

  it('pans the board with plain wheel events', async () => {
    const result = firstValueFrom(service.wheelMove$.pipe(take(1)));
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaX: 10,
      deltaY: -20,
    });

    board.dispatchEvent(event);

    await expect(result).resolves.toEqual({ x: 90, y: 220 });
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not pan large vertical-only pixel wheel events (mouse)', async () => {
    // A sizeable, purely vertical pixel delta is a mouse wheel (e.g. a browser
    // zoomed to a fractional level scaling the step), not a trackpad pan.
    const result = firstValueFrom(
      service.wheelMove$.pipe(
        take(1),
        timeout({ first: 20 }),
        catchError(() => of('no-pan')),
      ),
    );
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    });

    board.dispatchEvent(event);

    await expect(result).resolves.toBe('no-pan');
  });

  it('pans accelerated trackpad events without modifiers', async () => {
    const result = firstValueFrom(service.wheelMove$.pipe(take(1)));
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 35,
    });
    Object.defineProperty(event, 'wheelDelta', {
      value: -105,
    });

    board.dispatchEvent(event);

    await expect(result).resolves.toEqual({ x: 100, y: 165 });
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not pan pinch (ctrlKey) wheel events', async () => {
    // A ctrlKey wheel event is a pinch and must zoom, not pan.
    const result = firstValueFrom(
      service.wheelMove$.pipe(
        take(1),
        timeout({ first: 20 }),
        catchError(() => of('no-pan')),
      ),
    );
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaX: 10,
      deltaY: -20,
    });

    board.dispatchEvent(event);

    await expect(result).resolves.toBe('no-pan');
  });

  it('does not pan the board with plain mouse wheel events', async () => {
    const result = firstValueFrom(
      service.wheelMove$.pipe(
        take(1),
        timeout({ first: 20 }),
        catchError(() => of('no-pan')),
      ),
    );
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 4,
    });
    Object.defineProperty(event, 'wheelDelta', {
      value: -120,
    });

    board.dispatchEvent(event);

    await expect(result).resolves.toBe('no-pan');
  });

  it('pans when the wheel event targets a board child', async () => {
    const result = firstValueFrom(service.wheelMove$.pipe(take(1)));
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaX: 10,
      deltaY: -20,
    });

    workLayer.dispatchEvent(event);

    await expect(result).resolves.toEqual({ x: 90, y: 220 });
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores wheel events inside board controls', async () => {
    const controls = document.createElement('div');
    board.append(controls);

    const result = firstValueFrom(
      service.wheelMove$.pipe(
        take(1),
        timeout({ first: 20 }),
        catchError(() => of('no-pan')),
      ),
    );
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaX: 10,
      deltaY: -20,
    });

    controls.dispatchEvent(event);

    await expect(result).resolves.toBe('no-pan');
    expect(event.defaultPrevented).toBe(false);
  });

  it('does not pan the board with zoom wheel events', async () => {
    const result = firstValueFrom(
      service.wheelMove$.pipe(
        take(1),
        timeout({ first: 20 }),
        catchError(() => of('no-pan')),
      ),
    );
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: 20,
    });
    Object.defineProperty(event, 'wheelDelta', {
      value: -120,
    });

    board.dispatchEvent(event);

    await expect(result).resolves.toBe('no-pan');
  });
});
