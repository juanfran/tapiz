import {
  Component,
  ChangeDetectionStrategy,
  inject,
  viewChildren,
  ViewChildren,
} from '@angular/core';
import { NodeComponent } from '../node/node.component';
import { map } from 'rxjs/operators';
import { NodesStore } from '@team-up/nodes/services/nodes.store';
import { BoardFacade } from '../../../../services/board-facade.service';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PageActions } from '../../actions/page.actions';
import { filter } from 'rxjs';
import { HotkeysService } from '@team-up/cdk/services/hostkeys.service';
import { isInputField } from '@team-up/cdk/utils/is-input-field';
import { User } from '@team-up/board-commons';
import { pageFeature } from '../../reducers/page.reducer';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'team-up-nodes',
  styleUrls: ['./nodes.component.scss'],
  template: `
    @for (node of nodes$ | async; track node.id) {
      <team-up-node [node]="node" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [NodeComponent, AsyncPipe],
  providers: [HotkeysService],
})
export class NodesComponent {
  #boardFacade = inject(BoardFacade);
  #nodesStore = inject(NodesStore);
  #store = inject(Store);
  #hotkeysService = inject(HotkeysService);

  nodesComponents = viewChildren<NodeComponent>(NodeComponent);

  @ViewChildren(NodeComponent) nodesxx!: NodeComponent[];

  public nodes$ = this.#boardFacade.getNodes().pipe(
    map((it) => {
      return it.filter((it) => !['user', 'settings'].includes(it.type));
    }),
  );

  constructor() {
    this.#hotkeysService
      .listen({ key: 'Delete' })
      .pipe(
        takeUntilDestroyed(),
        filter(() => {
          return !isInputField();
        }),
      )
      .subscribe(() => {
        this.#onDeletePress();
      });

    this.#nodesStore.focusNode.pipe(takeUntilDestroyed()).subscribe((event) => {
      this.#store.dispatch(
        PageActions.setFocusId({
          focusId: event.id,
          ctrlKey: event.ctrlKey,
        }),
      );
    });

    this.#nodesStore.users = toSignal(
      this.#boardFacade
        .getUsers()
        .pipe(map((users) => users.map((it) => it.content))),
      {
        initialValue: [] as User[],
      },
    );
    this.#nodesStore.nodes = toSignal(this.#boardFacade.getNodes(), {
      initialValue: [],
    });
    this.#nodesStore.userId = this.#store.selectSignal(
      pageFeature.selectUserId,
    );
    this.#nodesStore.privateId = this.#store.selectSignal(
      pageFeature.selectPrivateId,
    );
    this.#nodesStore.zoom = this.#store.selectSignal(pageFeature.selectZoom);
    this.#nodesStore.canvasMode = this.#store.selectSignal(
      pageFeature.selectCanvasMode,
    );
    this.#nodesStore.emoji = this.#store.selectSignal(pageFeature.selectEmoji);
    this.#nodesStore.userHighlight = this.#store.selectSignal(
      pageFeature.selectUserHighlight,
    );
    this.#nodesStore.userVotes = this.#store.selectSignal(
      pageFeature.selectShowUserVotes,
    );
    this.#nodesStore.activeToolbarOption = this.#store.selectSignal(
      pageFeature.selectPopupOpen,
    );
  }

  #onDeletePress() {
    const nodes = this.nodesComponents()
      .filter((it) => {
        return it.state.get('focus') && !it.preventDelete?.();
      })
      .map((it) => {
        return {
          type: it.state.get('node').type,
          id: it.state.get('node').id,
        };
      });

    this.#nodesStore.actions.deleteNodes({
      nodes,
    });
  }
}
