import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { catchError, firstValueFrom, of, take, timeout } from 'rxjs';
import { describe, expect, it, beforeEach } from 'vitest';
import { ConfigService } from '../../../services/config.service';
import { boardPageFeature } from '../reducers/boardPage.reducer';
import { BoardZoomService } from './board-zoom.service';

describe('BoardZoomService', () => {
  let service: BoardZoomService;
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
        BoardZoomService,
        {
          provide: ConfigService,
          useValue: { config: { DEMO: false } },
        },
        provideMockStore({
          selectors: [
            {
              selector: boardPageFeature.selectZoom,
              value: 1,
            },
            {
              selector: boardPageFeature.selectPosition,
              value: { x: 0, y: 0 },
            },
          ],
        }),
      ],
    });

    service = TestBed.inject(BoardZoomService);
  });

  afterEach(() => {
    board.remove();
  });

  it('ignores plain wheel events', async () => {
    const result = firstValueFrom(
      service.zoom$.pipe(
        take(1),
        timeout({ first: 20 }),
        catchError(() => of('no-zoom')),
      ),
    );
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 20,
    });

    board.dispatchEvent(event);

    await expect(result).resolves.toBe('no-zoom');
  });

  it('zooms large vertical-only pixel wheel events (scaled mouse wheel)', async () => {
    // A sizeable, purely vertical pixel delta is a mouse wheel (e.g. a browser
    // zoomed to a fractional level scaling the step), not a trackpad pan.
    const result = firstValueFrom(service.zoom$.pipe(take(1)));
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    });

    board.dispatchEvent(event);

    await expect(result).resolves.toEqual({
      point: { x: 0, y: 0 },
      zoom: 0.925,
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores accelerated trackpad pan events without modifiers', async () => {
    const result = firstValueFrom(
      service.zoom$.pipe(
        take(1),
        timeout({ first: 20 }),
        catchError(() => of('no-zoom')),
      ),
    );
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 35,
    });
    Object.defineProperty(event, 'wheelDelta', {
      value: -105,
    });

    board.dispatchEvent(event);

    await expect(result).resolves.toBe('no-zoom');
  });

  it('zooms the board with plain mouse wheel events', async () => {
    const result = firstValueFrom(service.zoom$.pipe(take(1)));
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 40,
      clientY: 60,
      deltaY: 4,
    });
    Object.defineProperty(event, 'wheelDelta', {
      value: -120,
    });

    board.dispatchEvent(event);

    await expect(result).resolves.toEqual({
      point: { x: 40, y: 60 },
      zoom: 0.925,
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it('zooms smoothly in proportion to the pinch gesture', async () => {
    // Browsers expose a native trackpad pinch as a ctrlKey wheel event. A
    // small gesture should produce a small zoom change, not a fixed step.
    const result = firstValueFrom(service.zoom$.pipe(take(1)));
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: 1,
    });

    board.dispatchEvent(event);

    const zoomEvent = await result;

    expect(zoomEvent.point).toEqual({ x: 0, y: 0 });
    expect(zoomEvent.zoom).toBeCloseTo(0.999);
    expect(event.defaultPrevented).toBe(true);
  });

  it('keeps a fast pinch proportional instead of switching to a fixed step', async () => {
    const result = firstValueFrom(service.zoom$.pipe(take(1)));
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: 50,
    });

    board.dispatchEvent(event);

    const zoomEvent = await result;

    expect(zoomEvent.zoom).toBeCloseTo(0.9512);
  });

  it('keeps the fixed zoom step for a mouse wheel with Ctrl pressed', async () => {
    const result = firstValueFrom(service.zoom$.pipe(take(1)));
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: 100,
    });
    Object.defineProperty(event, 'wheelDelta', {
      value: -120,
    });

    board.dispatchEvent(event);

    await expect(result).resolves.toEqual({
      point: { x: 0, y: 0 },
      zoom: 0.925,
    });
  });

  it('zooms when the wheel event targets a board child', async () => {
    const result = firstValueFrom(service.zoom$.pipe(take(1)));
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 40,
      clientY: 60,
      deltaY: 20,
    });
    Object.defineProperty(event, 'wheelDelta', {
      value: -120,
    });

    workLayer.dispatchEvent(event);

    await expect(result).resolves.toEqual({
      point: { x: 40, y: 60 },
      zoom: 0.925,
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores wheel events inside board controls', async () => {
    const controls = document.createElement('div');
    board.append(controls);

    const result = firstValueFrom(
      service.zoom$.pipe(
        take(1),
        timeout({ first: 20 }),
        catchError(() => of('no-zoom')),
      ),
    );
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    });
    Object.defineProperty(event, 'wheelDelta', {
      value: -120,
    });

    controls.dispatchEvent(event);

    await expect(result).resolves.toBe('no-zoom');
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores wheel events targeting SVG content outside the board', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.append(path);
    document.body.append(svg);

    const result = firstValueFrom(
      service.zoom$.pipe(
        take(1),
        timeout({ first: 20 }),
        catchError(() => of('no-zoom')),
      ),
    );
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    });
    Object.defineProperty(event, 'wheelDelta', {
      value: -120,
    });

    path.dispatchEvent(event);

    await expect(result).resolves.toBe('no-zoom');
    expect(event.defaultPrevented).toBe(false);
    svg.remove();
  });
});
