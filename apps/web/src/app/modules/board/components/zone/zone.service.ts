import { Injectable, computed, inject, signal } from '@angular/core';
import { BoardMoveService } from '../../services/board-move.service';
import { Store } from '@ngrx/store';
import { pageFeature } from '../../reducers/page.reducer';
import {
  withLatestFrom,
  map,
  switchMap,
  takeUntil,
  finalize,
  Observable,
  startWith,
  Subscription,
} from 'rxjs';
import { PageActions } from '../../actions/page.actions';
import { BoardFacade } from '../../../../services/board-facade.service';
import { TuNode } from '@tapiz/board-commons';

interface SelectAction {
  userId: string;
  style: 'select' | 'group' | 'panel';
  position: { x: number; y: number };
  size: { width: number; height: number };
  relativeRect: DOMRect;
  layer: number;
}

@Injectable({
  providedIn: 'root',
})
export class ZoneService {
  #boardMoveService = inject(BoardMoveService);
  #store = inject(Store);
  #areaSelector = signal<SelectAction | null>(null);
  #boardFacade = inject(BoardFacade);

  selectMoveEnabled = this.#store.selectSignal(pageFeature.selectMoveEnabled);

  areaSelector = computed(() => this.#areaSelector());

  #setCursor(cursor: string) {
    this.#store.dispatch(PageActions.setBoardCursor({ cursor }));
  }

  #setMovement(enabled: boolean) {
    this.#store.dispatch(PageActions.setMoveEnabled({ enabled }));
  }

  #setNodeSelection(enabled: boolean) {
    this.#store.dispatch(PageActions.setNodeSelection({ enabled }));
  }

  select(cursor = 'crosshair') {
    this.#setCursor(cursor);
    this.#setNodeSelection(false);

    return this.#boardMoveService.nextMouseDown().pipe(
      withLatestFrom(
        this.#store.select(pageFeature.selectZoom),
        this.#store.select(pageFeature.selectPosition),
        this.#store.select(pageFeature.selectUserId),
        this.#store.select(pageFeature.selectBoardMode),
      ),
      map(([event, zoom, position, userId, layer]) => {
        return {
          userId,
          layer,
          position: {
            x: (-position.x + event.clientX) / zoom,
            y: (-position.y + event.clientY) / zoom,
          },
        };
      }),
      finalize(() => {
        this.#setCursor('default');
        this.#setNodeSelection(true);
      }),
    );
  }

  selectArea(style: SelectAction['style'] = 'select', cursor = 'crosshair') {
    const originalMoveEnabled = this.selectMoveEnabled();

    this.#setMovement(false);
    this.#setCursor(cursor);
    this.#setNodeSelection(false);
    let moveObs$: Subscription | null = null;

    const destroy = () => {
      this.#areaSelector.set(null);
      this.#setMovement(originalMoveEnabled);
      this.#setCursor('default');
      this.#setNodeSelection(true);

      if (moveObs$) {
        moveObs$.unsubscribe();
        moveObs$ = null;
      }
    };

    const obs$ = new Observable<SelectAction | null>((subscriber) => {
      moveObs$ = this.#boardMoveService
        .nextMouseDown()
        .pipe(
          withLatestFrom(
            this.#store.select(pageFeature.selectZoom),
            this.#store.select(pageFeature.selectPosition),
            this.#store.select(pageFeature.selectUserId),
            this.#store.select(pageFeature.selectBoardMode),
          ),
          switchMap(([mouseDownEvent, zoom, position, userId, layer]) => {
            const zoneDom = document.querySelector<HTMLElement>('tapiz-zone');

            return this.#boardMoveService.mouseMove$.pipe(
              takeUntil(this.#boardMoveService.mouseUp$),
              map((mouseMoveEvent) => {
                return {
                  width: (mouseMoveEvent.x - mouseDownEvent.clientX) / zoom,
                  height: (mouseMoveEvent.y - mouseDownEvent.clientY) / zoom,
                };
              }),
              map((size) => {
                const finalPosition = {
                  x: (-position.x + mouseDownEvent.clientX) / zoom,
                  y: (-position.y + mouseDownEvent.clientY) / zoom,
                };

                if (size.width < 0) {
                  size.width = -size.width;
                  finalPosition.x -= size.width;
                }

                if (size.height < 0) {
                  size.height = -size.height;
                  finalPosition.y -= size.height;
                }

                return {
                  userId,
                  style,
                  layer,
                  size,
                  position: finalPosition,
                  relativeRect:
                    zoneDom?.getBoundingClientRect() ?? new DOMRect(),
                };
              }),
              startWith({
                userId,
                style,
                position: {
                  x: (-position.x + mouseDownEvent.clientX) / zoom,
                  y: (-position.y + mouseDownEvent.clientY) / zoom,
                },
                size: { width: 0, height: 0 },
                relativeRect: new DOMRect(),
                layer,
              }),
            );
          }),
          finalize(() => {
            const result = this.#areaSelector();

            subscriber.next(result);
            subscriber.complete();
          }),
        )
        .subscribe((result) => {
          this.#areaSelector.set(result);
        });

      return () => {
        destroy();
      };
    });

    return obs$;
  }

  nodesInZone(area: { relativeRect: DOMRect; layer: number }) {
    const boardNodes = this.#boardFacade.get() as TuNode<
      { layer: number },
      string
    >[];

    const nodes = document.querySelectorAll<HTMLElement>('tapiz-node');

    return Array.from(nodes)
      .filter((node) => {
        const position = node.getBoundingClientRect();

        return (
          this.#isInside(position.x, position.y, area.relativeRect) ||
          this.#isInside(
            position.x + position.width,
            position.y,
            area.relativeRect,
          ) ||
          this.#isInside(
            position.x,
            position.y + position.height,
            area.relativeRect,
          ) ||
          this.#isInside(
            position.x + position.width,
            position.y + position.height,
            area.relativeRect,
          )
        );
      })
      .map((el) => {
        const node = boardNodes.find(
          (node) =>
            node.id === el.dataset['id'] && node.content.layer === area.layer,
        );

        if (node) {
          return node.id;
        }

        return null;
      })
      .filter((it): it is string => !!it);
  }

  #isInside(
    x: number,
    y: number,
    rect: { left: number; right: number; top: number; bottom: number },
  ) {
    return (
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    );
  }
}
