import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { fromEvent } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import type { Point } from '@tapiz/board-commons';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { PingStore } from './ping.store';
import { getPingArrow, projectBoardPointToViewport } from './ping-wall.utils';
import type { PingArrow } from './ping-wall.utils';

const EDGE_INSET = 160;
const PING_SIZE = 200;

type VisiblePing = {
  id: symbol;
  screenPosition: Point;
  arrow: PingArrow | null;
};

@Component({
  selector: 'tapiz-ping-wall',
  imports: [],
  template: `
    @for (ping of visiblePings(); track ping.id) {
      @if (ping.arrow) {
        <div
          class="ping-arrow"
          [style.left.px]="ping.arrow.position.x"
          [style.top.px]="ping.arrow.position.y"
          [style.transform]="
            'translate(-50%, -50%) rotate(' + ping.arrow.rotation + 'rad)'
          ">
          <span></span>
        </div>
      } @else {
        <div
          class="ping"
          [style.left.px]="ping.screenPosition.x"
          [style.top.px]="ping.screenPosition.y">
          <span></span>
        </div>
      }
    }
  `,
  styleUrls: ['./ping-wall.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PingWallComponent {
  #store = inject(Store);
  #pingStore = inject(PingStore);

  #zoom = this.#store.selectSignal(boardPageFeature.selectZoom);
  #position = this.#store.selectSignal(boardPageFeature.selectPosition);
  #viewport = toSignal(
    fromEvent(window, 'resize').pipe(
      startWith(null),
      map(() => {
        return {
          width: window.innerWidth,
          height: window.innerHeight,
        };
      }),
    ),
    {
      initialValue: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    },
  );

  visiblePings = computed<VisiblePing[]>(() => {
    const zoom = this.#zoom();
    const boardPosition = this.#position();
    const viewport = this.#viewport();

    return this.#pingStore.pings().map((ping) => {
      const screenPosition = projectBoardPointToViewport(
        ping.position,
        boardPosition,
        zoom,
      );

      return {
        id: ping.id,
        screenPosition,
        arrow: getPingArrow(screenPosition, viewport, {
          edgeInset: EDGE_INSET,
          pingSize: PING_SIZE,
        }),
      };
    });
  });
}
