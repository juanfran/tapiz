import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import {
  ArrowHead,
  ArrowNode,
  ArrowStrokeWidth,
  Point,
  TuNode,
} from '@tapiz/board-commons';
import { filter, pairwise } from 'rxjs';
import { NodeSpaceComponent } from '../../node-space';
import { ArrowConnectorComponent } from '../arrow-connector/arrow-connector.component';
import { BoardFacade } from '../../../../../services/board-facade.service';
import { boardPageFeature } from '../../../reducers/boardPage.reducer';
import { BoardPageActions } from '../../../actions/board-page.actions';
import {
  ArrowCreationConfig,
  ArrowEndpoints,
  absoluteFromArrow,
  buildArrowContent,
  findAttachment,
  resolveArrowEndpointTangents,
} from '../arrow-utils';
import { BoardActions } from '../../../actions/board.actions';
import { NodesActions } from '../../../services/nodes-actions';

@Component({
  selector: 'tapiz-arrow-node',
  template: `
    <tapiz-node-space
      [node]="node()"
      [showOutline]="false"
      [enabled]="draggable()"
      [draggable]="draggable()"
      [cursor]="draggable() ? 'grab' : 'default'">
      <tapiz-arrow-connector
        class="connector"
        [start]="start()"
        [end]="end()"
        [color]="color()"
        [strokeStyle]="strokeStyle()"
        [strokeWidth]="strokeWidth()"
        [arrowType]="arrowType()"
        [heads]="heads()"
        [startTangent]="tangents().start"
        [endTangent]="tangents().end"
        (mousedown)="selectArrow($event)" />

      @if (focus()) {
        <button
          class="endpoint no-drag"
          type="button"
          title="Move start"
          [style.left.px]="start().x"
          [style.top.px]="start().y"
          (mousedown)="dragEndpoint($event, 'start')"></button>

        <button
          class="endpoint no-drag"
          type="button"
          title="Move end"
          [style.left.px]="end().x"
          [style.top.px]="end().y"
          (mousedown)="dragEndpoint($event, 'end')"></button>
      }
    </tapiz-node-space>
  `,
  styleUrls: ['./arrow-node.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NodeSpaceComponent, ArrowConnectorComponent],
  host: {
    '[class.focus]': 'focus()',
  },
})
export class ArrowNodeComponent {
  #boardFacade = inject(BoardFacade);
  #destroyRef = inject(DestroyRef);
  #nodesActions = inject(NodesActions);
  #store = inject(Store);
  #zoom = this.#store.selectSignal(boardPageFeature.selectZoom);
  #position = this.#store.selectSignal(boardPageFeature.selectPosition);
  #popup = this.#store.selectSignal(boardPageFeature.selectPopupOpen);
  #cleanupEndpointDrag: (() => void) | null = null;

  node = input.required<TuNode<ArrowNode>>();
  pasted = input.required<boolean>();
  focus = input.required<boolean>();

  start = computed(() => this.node().content.start);
  end = computed(() => this.node().content.end);
  color = computed(() => this.node().content.color ?? '#1c1c1c');
  strokeStyle = computed(() => this.node().content.strokeStyle ?? 'solid');
  strokeWidth = computed<ArrowStrokeWidth>(() => {
    return this.node().content.strokeWidth ?? 2;
  });
  arrowType = computed(() => this.node().content.arrowType ?? 'sharp');
  heads = computed<ArrowHead[]>(() => {
    return this.node().content.heads ?? ['end'];
  });
  tangents = computed(() => {
    return resolveArrowEndpointTangents(
      this.node().content,
      this.#boardFacade.nodes(),
    );
  });

  draggable = computed(() => {
    const content = this.node().content;

    return !content.startAttachment && !content.endAttachment;
  });

  constructor() {
    this.#destroyRef.onDestroy(() => {
      this.#cleanupEndpointDrag?.();
    });

    toObservable(this.focus)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        pairwise(),
        filter(([previous, current]) => {
          return previous && !current && this.#popup() === 'arrow';
        }),
      )
      .subscribe(() => {
        this.#store.dispatch(BoardPageActions.setPopupOpen({ popup: '' }));
      });
  }

  selectArrow(event: MouseEvent) {
    this.#store.dispatch(BoardPageActions.setPopupOpen({ popup: 'arrow' }));
    this.#focusArrow(event);
  }

  dragEndpoint(event: MouseEvent, endpoint: 'start' | 'end') {
    event.preventDefault();
    event.stopPropagation();
    this.#focusArrow(event);
    this.#pushEndpointHistory();
    this.#cleanupEndpointDrag?.();

    const move = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      this.#moveEndpoint(endpoint, this.#boardPoint(moveEvent));
    };
    const up = () => {
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      this.#cleanupEndpointDrag = null;
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    this.#cleanupEndpointDrag = cleanup;
  }

  #focusArrow(event: MouseEvent) {
    this.#store.dispatch(
      BoardPageActions.setFocusId({
        focusId: this.node().id,
        ctrlKey: event.ctrlKey,
      }),
    );
  }

  #pushEndpointHistory() {
    const node = this.node();

    this.#boardFacade.patchHistory((history) => {
      history.past.unshift([
        {
          data: {
            id: node.id,
            type: node.type,
            content: node.content,
          },
          op: 'patch',
        },
      ]);
      history.future = [];

      return history;
    });
  }

  #moveEndpoint(endpoint: 'start' | 'end', point: Point) {
    const content = this.node().content;
    const movingEndpoint = findAttachment(point, this.#attachableNodes());
    const start =
      endpoint === 'start'
        ? movingEndpoint
        : this.#currentEndpoint(content, 'start');
    const end =
      endpoint === 'end'
        ? movingEndpoint
        : this.#currentEndpoint(content, 'end');
    const nextContent = buildArrowContent(this.#currentConfig(content), {
      start,
      end,
    });

    this.#patchContent(nextContent, false);
  }

  #currentEndpoint(
    content: ArrowNode,
    endpoint: 'start' | 'end',
  ): ArrowEndpoints['start'] {
    return {
      anchor: absoluteFromArrow(content, endpoint),
      attachment:
        endpoint === 'start' ? content.startAttachment : content.endAttachment,
    };
  }

  #currentConfig(content: ArrowNode): ArrowCreationConfig {
    return {
      color: content.color ?? null,
      strokeStyle: content.strokeStyle ?? 'solid',
      strokeWidth: content.strokeWidth ?? 2,
      arrowType: content.arrowType ?? 'sharp',
      heads: content.heads ?? ['end'],
      layer: content.layer,
    };
  }

  #attachableNodes() {
    return this.#boardFacade.filterBoardNodes(this.#boardFacade.nodes());
  }

  #boardPoint(event: MouseEvent): Point {
    const position = this.#position();
    const zoom = this.#zoom();

    return {
      x: (-position.x + event.clientX) / zoom,
      y: (-position.y + event.clientY) / zoom,
    };
  }

  #patchContent(content: Partial<ArrowNode>, history = true) {
    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history,
        actions: [
          this.#nodesActions.patch<ArrowNode>({
            id: this.node().id,
            type: this.node().type,
            content,
          }),
        ],
      }),
    );
  }
}
