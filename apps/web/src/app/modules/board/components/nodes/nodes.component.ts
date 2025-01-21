import {
  Component,
  ChangeDetectionStrategy,
  inject,
  viewChildren,
} from '@angular/core';
import { NodeComponent } from '../node/node.component';
import { map } from 'rxjs/operators';
import { NodesStore } from '../../services/nodes.store';
import { BoardFacade } from '../../../../services/board-facade.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, merge } from 'rxjs';
import { HotkeysService } from '@tapiz/cdk/services/hostkeys.service';
import { isInputField } from '@tapiz/cdk/utils/is-input-field';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'tapiz-nodes',
  styleUrls: ['./nodes.component.scss'],
  template: `
    @for (node of nodes$ | async; track node.id) {
      <tapiz-node [node]="node" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NodeComponent, AsyncPipe],
  providers: [HotkeysService],
})
export class NodesComponent {
  #boardFacade = inject(BoardFacade);
  #nodesStore = inject(NodesStore);
  #hotkeysService = inject(HotkeysService);

  nodesComponents = viewChildren<NodeComponent>(NodeComponent);

  public nodes$ = this.#boardFacade.getNodes().pipe(
    map((it) => {
      return this.#boardFacade.filterBoardNodes(it);
    }),
  );

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
