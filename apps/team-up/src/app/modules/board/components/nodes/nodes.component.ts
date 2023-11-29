import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RxFor } from '@rx-angular/template/for';
import { NodeComponent } from '../node/node.component';
import { map } from 'rxjs/operators';
import { NodesStore } from '@team-up/nodes/services/nodes.store';
import { BoardFacade } from '@/app/services/board-facade.service';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { selectUserId } from '../../selectors/page.selectors';

@Component({
  selector: 'team-up-nodes',
  styleUrls: ['./nodes.component.scss'],
  template: ` <team-up-node
    *rxFor="let node of nodes$; trackBy: 'id'"
    [node]="node" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, RxFor, NodeComponent],
  providers: [],
})
export class NodesComponent {
  private boardFacade = inject(BoardFacade);
  private nodesStore = inject(NodesStore);
  private store = inject(Store);

  public nodes$ = this.boardFacade.getNodes().pipe(
    map((it) => {
      return it.filter(
        (it) => !['note', 'group', 'panel', 'user'].includes(it.type),
      );
    }),
  );

  constructor() {
    // todo: find a better way to connect page state with nodes state, work for standalone nodes
    this.boardFacade
      .getUsers()
      .pipe(takeUntilDestroyed())
      .subscribe((users) => {
        this.nodesStore.users$.next(users.map((it) => it.content));
      });

    this.store
      .select(selectUserId)
      .pipe(takeUntilDestroyed())
      .subscribe((userId) => {
        this.nodesStore.userId$.next(userId);
      });
  }
}
