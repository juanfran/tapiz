import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Store } from '@ngrx/store';
import {
  ArrowHead,
  ArrowNode,
  BoardTuNode,
  Point,
  isBoardTuNode,
} from '@tapiz/board-commons';
import { boardPageFeature } from '../../../reducers/boardPage.reducer';
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
import { tap, takeLast, share, fromEvent, filter, Subscription } from 'rxjs';
import { BoardPageActions } from '../../../actions/board-page.actions';

interface DraftState {
  start: ArrowEndpoints['start'];
  startPoint: Point;
  initialPosition: Point;
}

const TMP_ARROW_ID = '__tmp-arrow__';

@Component({
  selector: 'tapiz-arrow-toolbar',
  standalone: true,
  imports: [MatButton],
  template: `
    <div class="wrapper">
      <div class="field">
        <label>Color</label>
        <input
          type="color"
          class="color-picker"
          [value]="color()"
          (input)="onColorChange($any($event.target).value)" />
      </div>

      <div class="field">
        <label>Stroke</label>
        <div class="button-group">
          @for (option of strokeOptions; track option.key) {
            <button
              mat-stroked-button
              color="primary"
              type="button"
              [class.active]="strokeStyle() === option.key"
              (click)="selectStroke(option.key)">
              {{ option.label }}
            </button>
          }
        </div>
      </div>

      <div class="field">
        <label>Shape</label>
        <div class="button-group">
          @for (option of typeOptions; track option.key) {
            <button
              type="button"
              mat-stroked-button
              color="primary"
              [class.active]="arrowType() === option.key"
              (click)="selectType(option.key)">
              {{ option.label }}
            </button>
          }
        </div>
      </div>

      <div class="field">
        <label>Arrowheads</label>
        <div class="button-group">
          <button
            mat-stroked-button
            color="primary"
            type="button"
            [class.active]="startHead()"
            (click)="toggleHead('start')">
            Start
          </button>
          <button
            mat-stroked-button
            color="primary"
            type="button"
            [class.active]="endHead()"
            (click)="toggleHead('end')">
            End
          </button>
        </div>
        <p class="note">Toggle endpoints to add arrowheads.</p>
      </div>

      <p class="hint">
        Click and drag on the board to draw an arrow. Press Esc to cancel.
      </p>
    </div>
  `,
  styleUrl: './arrow-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArrowToolbarComponent {
  #store = inject(Store);
  #destroyRef = inject(DestroyRef);
  #boardFacade = inject(BoardFacade);
  #nodesActions = inject(NodesActions);
  #zoneService = inject(ZoneService);

  #boardMode = this.#store.selectSignal(boardPageFeature.selectBoardMode);
  #selectAreaSubscription: Subscription | null = null;

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
    this.#listenCancel();
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
    let started = false;

    const selectArea$ = this.#zoneService
      .selectArea('invisible', 'crosshair', true)
      .pipe(share());

    this.#selectAreaSubscription = selectArea$
      .pipe(
        tap((zone) => {
          if (!zone) {
            return;
          }

          if (!started) {
            started = this.#beginDraft(zone.position);
          }

          if (started && this.#draft) {
            this.#updateDraft(zone.mousePosition);
          }
        }),
      )
      .subscribe();

    selectArea$.pipe(takeLast(1)).subscribe((zone) => {
      if (started && zone) {
        this.#completeDraft(zone.mousePosition);
        started = false;
      }
    });
  }

  #listenCancel() {
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        filter((event) => event.key === 'Escape'),
        tap((event) => {
          event.preventDefault();
          this.#cancelDraft();
        }),
      )
      .subscribe();
  }

  #beginDraft(point: Point) {
    const start = findAttachment(point, this.attachableNodes());

    this.#draft = {
      start,
      startPoint: start.anchor,
      initialPosition: point,
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

  #completeDraft(position: Point) {
    if (!this.#draft) {
      return;
    }

    const end = findAttachment(position, this.attachableNodes());

    const endpoints: ArrowEndpoints = {
      start: this.#draft.start,
      end,
    };

    this.#preview(endpoints);
    this.#commit(endpoints);

    this.#cancelDraft();
  }

  #cancelDraft() {
    if (!this.#draft) {
      return;
    }

    if (this.#selectAreaSubscription) {
      this.#selectAreaSubscription.unsubscribe();
      this.#selectAreaSubscription = null;
    }

    this.#boardFacade.tmpNode.set(null);
    this.#draft = null;
    this.#store.dispatch(BoardPageActions.setPopupOpen({ popup: '' }));
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
}
