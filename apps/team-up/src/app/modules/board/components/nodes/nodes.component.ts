import {
  Component,
  ChangeDetectionStrategy,
  inject,
  viewChildren,
} from '@angular/core';
import { RxFor } from '@rx-angular/template/for';
import { NodeComponent } from '../node/node.component';
import { map } from 'rxjs/operators';
import { NodesStore } from '@team-up/nodes/services/nodes.store';
import { BoardFacade } from '../../../../services/board-facade.service';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  selectUserId,
  selectZoom,
  selectPrivateId,
  selectCanvasMode,
  selectPopupOpen,
  selectEmoji,
  selectUserHighlight,
  selectShowUserVotes,
} from '../../selectors/page.selectors';
import { PageActions } from '../../actions/page.actions';
import { filter } from 'rxjs';
import { HotkeysService } from '@team-up/cdk/services/hostkeys.service';
import { isInputField } from '@team-up/cdk/utils/is-input-field';
import { BoardActions } from '../../actions/board.actions';
import { NodeRemove } from '@team-up/board-commons';

@Component({
  selector: 'team-up-nodes',
  styleUrls: ['./nodes.component.scss'],
  template: ` <team-up-node
    *rxFor="let node of nodes$; trackBy: 'id'"
    [node]="node" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RxFor, NodeComponent],
  providers: [HotkeysService],
})
export class NodesComponent {
  private boardFacade = inject(BoardFacade);
  private nodesStore = inject(NodesStore);
  private store = inject(Store);
  private nodes = viewChildren<NodeComponent>(NodeComponent);
  private hotkeysService = inject(HotkeysService);

  public nodes$ = this.boardFacade.getNodes().pipe(
    map((it) => {
      return it.filter((it) => !['user', 'settings'].includes(it.type));
    }),
  );

  constructor() {
    this.hotkeysService
      .listen({ key: 'Delete' })
      .pipe(
        filter(() => {
          return !isInputField();
        }),
      )
      .subscribe(() => {
        this.onDeletePress();
      });

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

    this.store
      .select(selectPrivateId)
      .pipe(takeUntilDestroyed())
      .subscribe((privateId) => {
        this.nodesStore.privateId$.next(privateId);
      });

    this.store
      .select(selectZoom)
      .pipe(takeUntilDestroyed())
      .subscribe((zoom) => {
        this.nodesStore.zoom$.next(zoom);
      });

    this.store
      .select(selectCanvasMode)
      .pipe(takeUntilDestroyed())
      .subscribe((canvasMode) => {
        this.nodesStore.canvasMode$.next(canvasMode);
      });

    this.boardFacade
      .getNodes()
      .pipe(takeUntilDestroyed())
      .subscribe((nodes) => {
        this.nodesStore.nodes$.next(nodes);
      });

    this.nodesStore.focusNode.subscribe((event) => {
      this.store.dispatch(
        PageActions.setFocusId({
          focusId: event.id,
          ctrlKey: event.ctrlKey,
        }),
      );
    });

    this.store
      .select(selectPopupOpen)
      .pipe(takeUntilDestroyed())
      .subscribe((popupOpen) => {
        this.nodesStore.activeToolbarOption$.next(popupOpen);
      });

    this.store
      .select(selectEmoji)
      .pipe(takeUntilDestroyed())
      .subscribe((emoji) => {
        this.nodesStore.emoji$.next(emoji);
      });

    this.store
      .select(selectUserHighlight)
      .pipe(takeUntilDestroyed())
      .subscribe((user) => {
        this.nodesStore.userHighlight$.next(user);
      });

    this.store
      .select(selectShowUserVotes)
      .pipe(takeUntilDestroyed())
      .subscribe((user) => {
        this.nodesStore.userVotes$.next(user);
      });
  }

  private onDeletePress() {
    const nodes = this.nodes().filter((it) => {
      return it.state.get('focus') && !it.preventDelete?.();
    });

    const actions = nodes.map((it) => {
      return {
        data: {
          type: it.state.get('node').type,
          id: it.state.get('node').id,
        },
        op: 'remove',
      } as NodeRemove;
    });

    this.store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: actions,
      }),
    );
  }
}
