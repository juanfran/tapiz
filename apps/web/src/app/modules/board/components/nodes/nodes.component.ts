import {
  Component,
  ChangeDetectionStrategy,
  inject,
  viewChildren,
  computed,
  effect,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { NodeComponent } from '../node/node.component';
import { NodesStore } from '../../services/nodes.store';
import { BoardFacade } from '../../../../services/board-facade.service';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, merge } from 'rxjs';
import { HotkeysService } from '@tapiz/cdk/services/hostkeys.service';
import { isInputField } from '@tapiz/cdk/utils/is-input-field';
import { RxFor } from '@rx-angular/template/for';
import { SpatialIndexService } from '@tapiz/cdk/services/spatial-index.service';
import type { BoardTuNode } from '@tapiz/board-commons';

const DEFAULT_NODE_SIZE = 300;
const VIEWPORT_BUFFER = 200;

@Component({
  selector: 'tapiz-nodes',
  styleUrls: ['./nodes.component.scss'],
  template: `
    <tapiz-node
      *rxFor="let node of nodes(); trackBy: 'id'"
      [node]="node" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NodeComponent, RxFor],
  providers: [HotkeysService],
})
export class NodesComponent {
  #boardFacade = inject(BoardFacade);
  #nodesStore = inject(NodesStore);
  #hotkeysService = inject(HotkeysService);
  #store = inject(Store);
  #spatialIndex = inject(SpatialIndexService);

  #zoom = this.#store.selectSignal(boardPageFeature.selectZoom);
  #position = this.#store.selectSignal(boardPageFeature.selectPosition);
  #focusIds = this.#store.selectSignal(boardPageFeature.selectFocusId);

  nodesComponents = viewChildren<NodeComponent>(NodeComponent);

  nodes = computed(() => {
    const allNodes = this.#boardFacade.filterBoardNodes(
      this.#boardFacade.nodes(),
    );
    return this.#filterByViewport(allNodes);
  });

  #filterByViewport(nodes: BoardTuNode[]): BoardTuNode[] {
    const zoom = this.#zoom();
    const position = this.#position();
    const focusIds = this.#focusIds();

    const viewLeft = -position.x / zoom - VIEWPORT_BUFFER / zoom;
    const viewTop = -position.y / zoom - VIEWPORT_BUFFER / zoom;
    const viewRight =
      (window.innerWidth - position.x) / zoom + VIEWPORT_BUFFER / zoom;
    const viewBottom =
      (window.innerHeight - position.y) / zoom + VIEWPORT_BUFFER / zoom;

    // Use R-tree for O(log n) spatial query
    const visibleIds = this.#spatialIndex.queryViewport(
      viewLeft,
      viewTop,
      viewRight,
      viewBottom,
    );

    return nodes.filter((node) => {
      return focusIds.includes(node.id) || visibleIds.has(node.id);
    });
  }

  constructor() {
    // Keep spatial index in sync with node state
    effect(() => {
      const allNodes = this.#boardFacade.filterBoardNodes(
        this.#boardFacade.nodes(),
      );
      this.#spatialIndex.bulkLoad(
        allNodes
          .filter((n) => n.content.position)
          .map((n) => ({
            id: n.id,
            x: n.content.position.x,
            y: n.content.position.y,
            w: n.content.width ?? DEFAULT_NODE_SIZE,
            h: n.content.height ?? DEFAULT_NODE_SIZE,
          })),
      );
    });

    merge(
      this.#hotkeysService.listen({ key: 'Backspace' }),
      this.#hotkeysService.listen({ key: 'Delete' }),
    )
      .pipe(
        takeUntilDestroyed(),
        filter(() => {
          return !isInputField();
        }),
      )
      .subscribe((e) => {
        e.preventDefault();
        this.#onDeletePress();
      });
  }

  #onDeletePress() {
    const nodes = this.nodesComponents()
      .filter((it) => {
        return it.focus() && !it.preventDelete?.();
      })
      .map((it) => {
        return {
          type: it.node().type,
          id: it.node().id,
        };
      });

    this.#nodesStore.deleteNodes(nodes);
  }
}
