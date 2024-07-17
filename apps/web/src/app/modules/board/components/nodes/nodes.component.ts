import {
  Component,
  ChangeDetectionStrategy,
  inject,
  viewChildren,
} from '@angular/core';
import { NodeComponent } from '../node/node.component';
import { map } from 'rxjs/operators';
import { NodesStore } from '@tapiz/nodes/services/nodes.store';
import { BoardFacade } from '../../../../services/board-facade.service';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PageActions } from '../../actions/page.actions';
import { filter, merge } from 'rxjs';
import { HotkeysService } from '@tapiz/cdk/services/hostkeys.service';
import { isInputField } from '@tapiz/cdk/utils/is-input-field';
import { BoardTuNode, User } from '@tapiz/board-commons';
import { pageFeature } from '../../reducers/page.reducer';
import { AsyncPipe } from '@angular/common';
import { ConfigService } from '../../../../services/config.service';

@Component({
  selector: 'tapiz-nodes',
  styleUrls: ['./nodes.component.scss'],
  template: `
    @for (node of nodes$ | async; track node.id) {
      <tapiz-node [node]="node" />
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
  #configService = inject(ConfigService);

  nodesComponents = viewChildren<NodeComponent>(NodeComponent);

  public nodes$ = this.#boardFacade.getNodes().pipe(
    map((it) => {
      return it.filter(
        (it) => !['user', 'settings'].includes(it.type),
      ) as BoardTuNode[];
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
    this.#nodesStore.boardMode = this.#store.selectSignal(
      pageFeature.selectBoardMode,
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

    this.#nodesStore.apiUrl = this.#configService.config.API_URL;
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
