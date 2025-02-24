import {
  Component,
  ChangeDetectionStrategy,
  inject,
  viewChildren,
  computed,
} from '@angular/core';
import { NodeComponent } from '../node/node.component';
import { NodesStore } from '../../services/nodes.store';
import { BoardFacade } from '../../../../services/board-facade.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, merge } from 'rxjs';
import { HotkeysService } from '@tapiz/cdk/services/hostkeys.service';
import { isInputField } from '@tapiz/cdk/utils/is-input-field';
import { RxFor } from '@rx-angular/template/for';

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

  nodesComponents = viewChildren<NodeComponent>(NodeComponent);

  nodes = computed(() => {
    return this.#boardFacade.filterBoardNodes(this.#boardFacade.nodes());
  });

  constructor() {
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

    this.#nodesStore.actions.deleteNodes({
      nodes,
    });
  }
}
