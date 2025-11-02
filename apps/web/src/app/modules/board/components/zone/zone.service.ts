import { Injectable, computed, inject, signal } from '@angular/core';
import { BoardMoveService } from '../../services/board-move.service';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import {
  withLatestFrom,
  map,
  switchMap,
  takeUntil,
  finalize,
  Observable,
  startWith,
  Subscription,
  tap,
} from 'rxjs';
import { BoardPageActions } from '../../actions/board-page.actions';
import { BoardFacade } from '../../../../services/board-facade.service';
import { Point } from '@tapiz/board-commons';

export interface SelectAction {
  userId: string;
  style: 'select' | 'group' | 'panel' | 'invisible';
  position: Point;
  mousePosition: Point;
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

  selectMoveEnabled = this.#store.selectSignal(
    boardPageFeature.selectMoveEnabled,
  );

  areaSelector = computed(() => this.#areaSelector());

  #setCursor(cursor: string) {
    this.#store.dispatch(BoardPageActions.setBoardCursor({ cursor }));
  }

  #setMovement(enabled: boolean) {
    this.#store.dispatch(BoardPageActions.setMoveEnabled({ enabled }));
  }

  #setNodeSelection(enabled: boolean) {
    this.#store.dispatch(BoardPageActions.setNodeSelection({ enabled }));
  }

  select(cursor = 'crosshair') {
    this.#setCursor(cursor);
    this.#setNodeSelection(false);

    return this.#boardMoveService.nextMouseDown().pipe(
      withLatestFrom(
        this.#store.select(boardPageFeature.selectZoom),
        this.#store.select(boardPageFeature.selectPosition),
        this.#store.select(boardPageFeature.selectUserId),
        this.#store.select(boardPageFeature.selectBoardMode),
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

  selectArea(
    style: SelectAction['style'] = 'select',
    cursor = 'crosshair',
    live = false,
  ) {
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
            this.#store.select(boardPageFeature.selectZoom),
            this.#store.select(boardPageFeature.selectPosition),
            this.#store.select(boardPageFeature.selectUserId),
            this.#store.select(boardPageFeature.selectBoardMode),
          ),
          switchMap(([mouseDownEvent, zoom, position, userId, layer]) => {
            const zoneDom = document.querySelector<HTMLElement>('tapiz-zone');

            return this.#boardMoveService.mouseMove$.pipe(
              takeUntil(this.#boardMoveService.mouseUp$),
              map((event) => {
                let width = (event.x - mouseDownEvent.clientX) / zoom;
                let height = (event.y - mouseDownEvent.clientY) / zoom;
                const finalPosition = {
                  x: (-position.x + mouseDownEvent.clientX) / zoom,
                  y: (-position.y + mouseDownEvent.clientY) / zoom,
                };
                const mousePosition = {
                  x: (-position.x + event.x) / zoom,
                  y: (-position.y + event.y) / zoom,
                };

                if (width < 0) {
                  width = -width;
                  finalPosition.x -= width;
                }

                if (height < 0) {
                  height = -height;
                  finalPosition.y -= height;
                }

                return {
                  userId,
                  style,
                  layer,
                  size: {
                    width,
                    height,
                  },
                  position: finalPosition,
                  mousePosition,
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
                mousePosition: {
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

          if (live) {
            subscriber.next(result);
          }
        });

      return () => {
        destroy();
      };
    });

    return obs$;
  }

  nodesInZone(area: { relativeRect: DOMRect; layer: number }) {
    const boardNodes = this.#boardFacade.get();

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
            node.id === el.dataset['id'] &&
            'layer' in node.content &&
            node.content.layer === area.layer,
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
