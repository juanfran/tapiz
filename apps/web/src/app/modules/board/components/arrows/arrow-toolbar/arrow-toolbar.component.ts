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
  ArrowStrokeWidth,
  BoardTuNode,
  Point,
  TuNode,
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
  imports: [MatButton],
  template: `
    <div class="wrapper">
      <div class="field">
        <label>Color</label>
        <input
          type="color"
          class="color-picker"
          [value]="colorValue()"
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
              [class.active]="strokeStyleValue() === option.key"
              (click)="selectStroke(option.key)">
              {{ option.label }}
            </button>
          }
        </div>
      </div>

      <div class="field">
        <label>Width</label>
        <div class="button-group">
          @for (option of strokeWidthOptions; track option.key) {
            <button
              mat-stroked-button
              color="primary"
              type="button"
              class="width-option"
              [title]="option.label"
              [class.active]="strokeWidthValue() === option.key"
              (click)="selectStrokeWidth(option.key)">
              <div class="width-option-content">
                <span
                  class="width-preview"
                  [style.blockSize.px]="option.key"></span>
              </div>
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
              [class.active]="arrowTypeValue() === option.key"
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
            [class.active]="hasStartHead()"
            (click)="toggleHead('start')">
            Start
          </button>
          <button
            mat-stroked-button
            color="primary"
            type="button"
            [class.active]="hasEndHead()"
            (click)="toggleHead('end')">
            End
          </button>
        </div>
        <p class="note">Toggle endpoints to add arrowheads.</p>
      </div>

      @if (!selectedArrow()) {
        <p class="hint">
          Click and drag on the board to draw an arrow. Press Esc to cancel.
        </p>
      }
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
  strokeWidth = signal<ArrowStrokeWidth>(2);
  arrowType = signal<'sharp' | 'curved' | 'elbow'>('sharp');
  startHead = signal(false);
  endHead = signal(true);

  selectedArrow = computed(() => {
    return (
      this.#boardFacade.focusNodes().find((node): node is ArrowBoardNode => {
        return node.type === 'arrow';
      }) ?? null
    );
  });

  colorValue = computed(() => {
    return this.selectedArrow()?.content.color ?? this.color();
  });

  strokeStyleValue = computed<NonNullable<ArrowNode['strokeStyle']>>(() => {
    return this.selectedArrow()?.content.strokeStyle ?? this.strokeStyle();
  });

  strokeWidthValue = computed<ArrowStrokeWidth>(() => {
    return this.selectedArrow()?.content.strokeWidth ?? this.strokeWidth();
  });

  arrowTypeValue = computed<NonNullable<ArrowNode['arrowType']>>(() => {
    return this.selectedArrow()?.content.arrowType ?? this.arrowType();
  });

  strokeOptions: { key: ArrowNode['strokeStyle']; label: string }[] = [
    { key: 'solid', label: 'Solid' },
    { key: 'dashed', label: 'Dashed' },
    { key: 'dotted', label: 'Dotted' },
  ];

  strokeWidthOptions: { key: ArrowStrokeWidth; label: string }[] = [
    { key: 2, label: 'S' },
    { key: 4, label: 'M' },
    { key: 6, label: 'L' },
  ];

  typeOptions: { key: ArrowNode['arrowType']; label: string }[] = [
    { key: 'sharp', label: 'Straight' },
    { key: 'curved', label: 'Curved' },
    { key: 'elbow', label: 'Elbow' },
  ];

  heads = computed<ArrowHead[]>(() => {
    const selectedArrow = this.selectedArrow();

    if (selectedArrow) {
      return selectedArrow.content.heads ?? ['end'];
    }

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
  hasStartHead = computed(() => this.heads().includes('start'));
  hasEndHead = computed(() => this.heads().includes('end'));

  attachableNodes = computed(() => {
    return this.#boardFacade
      .filterBoardNodes(this.#boardFacade.nodes())
      .filter((node): node is BoardTuNode => {
        return node.type !== 'arrow' && isBoardTuNode(node);
      });
  });

  #draft: DraftState | null = null;

  constructor() {
    if (!this.selectedArrow()) {
      this.#listenPointer();
    }

    this.#listenCancel();
  }

  onColorChange(value: string) {
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
      return;
    }

    if (this.selectedArrow()) {
      this.#patchSelectedArrow({ color: value });
    } else {
      this.color.set(value);
    }
  }

  selectStroke(style: ArrowNode['strokeStyle']) {
    if (this.selectedArrow()) {
      this.#patchSelectedArrow({ strokeStyle: style });
    } else {
      this.strokeStyle.set(style);
    }
  }

  selectStrokeWidth(width: ArrowStrokeWidth) {
    if (this.selectedArrow()) {
      this.#patchSelectedArrow({ strokeWidth: width });
    } else {
      this.strokeWidth.set(width);
    }
  }

  selectType(type: ArrowNode['arrowType']) {
    if (this.selectedArrow()) {
      this.#patchSelectedArrow({ arrowType: type });
    } else {
      this.arrowType.set(type);
    }
  }

  toggleHead(head: ArrowHead) {
    if (this.selectedArrow()) {
      this.#patchSelectedArrow({
        heads: toggleHeadValue(this.heads(), head),
      });

      return;
    }

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
    const committed = this.#commit(endpoints);

    this.#cancelDraft({ closePopup: !committed });
  }

  #cancelDraft(options = { closePopup: true }) {
    if (!this.#draft) {
      return;
    }

    if (this.#selectAreaSubscription) {
      this.#selectAreaSubscription.unsubscribe();
      this.#selectAreaSubscription = null;
    }

    this.#boardFacade.tmpNode.set(null);
    this.#draft = null;

    if (options.closePopup) {
      this.#store.dispatch(BoardPageActions.setPopupOpen({ popup: '' }));
    }
  }

  #commit(endpoints: ArrowEndpoints) {
    const length = Math.hypot(
      endpoints.end.anchor.x - endpoints.start.anchor.x,
      endpoints.end.anchor.y - endpoints.start.anchor.y,
    );

    if (length < ARROW_PADDING / 2) {
      return false;
    }

    const content = buildArrowContent(this.#currentConfig(), endpoints);
    const action = this.#nodesActions.add<ArrowNode>('arrow', content);

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: [action],
      }),
    );

    return true;
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
      color: this.colorValue(),
      strokeStyle: this.strokeStyleValue(),
      strokeWidth: this.strokeWidthValue(),
      arrowType: this.arrowTypeValue(),
      heads,
      layer: boardModeToLayer(this.#boardMode()),
    };
  }

  #patchSelectedArrow(content: Partial<ArrowNode>) {
    const selectedArrow = this.selectedArrow();

    if (!selectedArrow) {
      return;
    }

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: [
          this.#nodesActions.patch<ArrowNode>({
            id: selectedArrow.id,
            type: selectedArrow.type,
            content,
          }),
        ],
      }),
    );
  }
}

function boardModeToLayer(boardMode: number): ArrowNode['layer'] {
  return boardMode === 1 ? 1 : 0;
}

type ArrowBoardNode = TuNode<ArrowNode, 'arrow'>;

function toggleHeadValue(heads: ArrowHead[], head: ArrowHead) {
  return heads.includes(head)
    ? heads.filter((item) => item !== head)
    : [...heads, head];
}
