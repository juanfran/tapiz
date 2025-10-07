import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { fromEvent, EMPTY } from 'rxjs';
import { filter, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import {
  ArrowHead,
  ArrowNode,
  BoardTuNode,
  Point,
  isBoardTuNode,
} from '@tapiz/board-commons';
import { boardPageFeature } from '../../../reducers/boardPage.reducer';
import { BoardPageActions } from '../../../actions/board-page.actions';
import { BoardFacade } from '../../../../../services/board-facade.service';
import { BoardActions } from '../../../actions/board.actions';
import { NodesActions } from '../../../services/nodes-actions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ARROW_PADDING,
  ArrowEndpoints,
  buildArrowContent,
  findAttachment,
} from '../arrow-utils';
import { MatButton } from '@angular/material/button';
import { ZoneService } from '../../zone/zone.service';
interface DraftState {
  start: ArrowEndpoints['start'];
  startPoint: Point;
  prev: {
    moveEnabled: boolean;
    dragEnabled: boolean;
  };
}

const TMP_ARROW_ID = '__tmp-arrow__';

@Component({
  selector: 'tapiz-arrow-toolbar',
  standalone: true,
  imports: [CommonModule, MatButton],
  templateUrl: './arrow-toolbar.component.html',
  styleUrl: './arrow-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArrowToolbarComponent {
  #store = inject(Store);
  #destroyRef = inject(DestroyRef);
  #boardFacade = inject(BoardFacade);
  #nodesActions = inject(NodesActions);
  #zoneService = inject(ZoneService);

  #zoom = this.#store.selectSignal(boardPageFeature.selectZoom);
  #position = this.#store.selectSignal(boardPageFeature.selectPosition);
  #boardMode = this.#store.selectSignal(boardPageFeature.selectBoardMode);
  #dragEnabled = this.#store.selectSignal(boardPageFeature.selectDragEnabled);
  #moveEnabled = this.#store.selectSignal(boardPageFeature.selectMoveEnabled);

  color = signal('#1c1c1c');
  strokeStyle = signal<'solid' | 'dashed' | 'dotted'>('solid');
  arrowType = signal<'sharp' | 'curved' | 'elbow'>('sharp');
  startHead = signal(false);
  endHead = signal(true);

  strokeOptions: { key: ArrowNode['strokeStyle']; label: string }[] = [
    { key: 'solid', label: 'Solid' },
    { key: 'dashed', label: 'Dashed' },
    { key: 'dotted', label: 'Dotted' },
  ];

  typeOptions: { key: ArrowNode['arrowType']; label: string }[] = [
    { key: 'sharp', label: 'Straight' },
    { key: 'curved', label: 'Curved' },
    { key: 'elbow', label: 'Elbow' },
  ];

  heads = computed<ArrowHead[]>(() => {
    const heads: ArrowHead[] = [];

    if (this.startHead()) {
      heads.push('start');
    }

    if (this.endHead()) {
      heads.push('end');
    }

    if (!heads.length) {
      heads.push('end');
    }

    return heads;
  });

  attachableNodes = computed(() => {
    return this.#boardFacade
      .filterBoardNodes(this.#boardFacade.nodes())
      .filter((node): node is BoardTuNode => {
        return node.type !== 'arrow' && isBoardTuNode(node);
      });
  });

  #draft: DraftState | null = null;

  constructor() {
    this.#listenPointer();
    // this.#listenCancel();

    effect(
      () => {
        this.#cancelDraft();
      },
      { allowSignalWrites: true },
    );
  }

  onColorChange(value: string) {
    if (value.startsWith('#')) {
      this.color.set(value);
    }
  }

  selectStroke(style: ArrowNode['strokeStyle']) {
    this.strokeStyle.set(style);
  }

  selectType(type: ArrowNode['arrowType']) {
    this.arrowType.set(type);
  }

  toggleHead(head: ArrowHead) {
    if (head === 'start') {
      this.startHead.update((current) => !current);
    } else {
      this.endHead.update((current) => !current);
    }
  }

  #listenPointer() {
    let started: any = null;

    this.#zoneService
      .selectArea('invisible', 'crosshair', true)
      .subscribe((zone) => {
        console.log('Selected zone:', zone);

        if (!zone) {
          return;
        }

        if (!started) {
          started = this.#beginDraft(zone.position);
        }
        if (started) {
          this.#updateDraft(zone.position);
        }
      });

    // fromEvent<MouseEvent>(document, 'mousedown')
    //   .pipe(
    //     takeUntilDestroyed(this.#destroyRef),
    //     filter((event) => event.button === 0),
    //     filter((event) => !event.shiftKey && !event.metaKey && !event.altKey),
    //     filter((event) => this.#isInsideBoard(event)),
    //     switchMap((downEvent) => {
    //       const started = this.#beginDraft(downEvent);

    //       if (!started) {
    //         return EMPTY;
    //       }

    //       return fromEvent<MouseEvent>(document, 'mousemove').pipe(
    //         tap((moveEvent) => this.#updateDraft(moveEvent)),
    //         takeUntil(
    //           fromEvent<MouseEvent>(document, 'mouseup').pipe(
    //             take(1),
    //             tap((upEvent) => this.#completeDraft(upEvent)),
    //           ),
    //         ),
    //       );
    //     }),
    //   )
    //   .subscribe();
  }

  // #listenCancel() {
  //   fromEvent<KeyboardEvent>(document, 'keydown')
  //     .pipe(
  //       takeUntilDestroyed(this.#destroyRef),
  //       filter((event) => event.key === 'Escape'),
  //       tap((event) => {
  //         event.preventDefault();
  //         this.#cancelDraft();
  //       }),
  //     )
  //     .subscribe();
  // }

  #beginDraft(point: Point) {
    const start = findAttachment(point, this.attachableNodes());

    this.#draft = {
      start,
      startPoint: start.anchor,
      prev: {
        moveEnabled: this.#moveEnabled(),
        dragEnabled: this.#dragEnabled(),
      },
    };

    this.#preview({
      start,
      end: start,
    });

    return true;
  }

  #updateDraft(position: Point) {
    if (!this.#draft) {
      return;
    }

    const end = findAttachment(position, this.attachableNodes());

    this.#preview({
      start: this.#draft.start,
      end,
    });
  }

  #completeDraft(event: MouseEvent) {
    if (!this.#draft) {
      return;
    }

    const end = findAttachment(
      this.#toBoardPoint(event),
      this.attachableNodes(),
    );

    const endpoints: ArrowEndpoints = {
      start: this.#draft.start,
      end,
    };

    this.#preview(endpoints);
    this.#commit(endpoints);
    this.#resetDraft();
  }

  #cancelDraft() {
    if (!this.#draft) {
      this.#boardFacade.tmpNode.set(null);
      return;
    }

    this.#resetDraft();
  }

  #commit(endpoints: ArrowEndpoints) {
    const length = Math.hypot(
      endpoints.end.anchor.x - endpoints.start.anchor.x,
      endpoints.end.anchor.y - endpoints.start.anchor.y,
    );

    if (length < ARROW_PADDING / 2) {
      return;
    }

    const content = buildArrowContent(this.#currentConfig(), endpoints);
    const action = this.#nodesActions.add<ArrowNode>('arrow', content);

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: [action],
      }),
    );
  }

  #resetDraft() {
    const prev = this.#draft?.prev;

    if (prev) {
      this.#store.dispatch(
        BoardPageActions.setDragEnabled({ dragEnabled: prev.dragEnabled }),
      );
      this.#store.dispatch(
        BoardPageActions.setMoveEnabled({ enabled: prev.moveEnabled }),
      );
    }

    this.#store.dispatch(BoardPageActions.setNodeSelection({ enabled: true }));
    this.#store.dispatch(
      BoardPageActions.setBoardCursor({ cursor: 'default' }),
    );
    this.#boardFacade.tmpNode.set(null);
    this.#draft = null;
  }

  #preview(endpoints: ArrowEndpoints) {
    const content = buildArrowContent(this.#currentConfig(), endpoints);

    this.#boardFacade.tmpNode.set({
      id: TMP_ARROW_ID,
      type: 'arrow',
      content,
    });
  }

  #currentConfig() {
    const heads = this.heads();

    return {
      color: this.color(),
      strokeStyle: this.strokeStyle(),
      arrowType: this.arrowType(),
      heads,
      layer: this.#boardMode(),
    };
  }

  #isInsideBoard(event: MouseEvent) {
    const workLayer = document.querySelector<HTMLElement>('.work-layer');

    if (!workLayer) {
      return false;
    }

    const rect = workLayer.getBoundingClientRect();

    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  #toBoardPoint(event: MouseEvent): Point {
    const zoom = this.#zoom();
    const position = this.#position();

    return {
      x: (-position.x + event.clientX) / zoom,
      y: (-position.y + event.clientY) / zoom,
    };
  }
}
