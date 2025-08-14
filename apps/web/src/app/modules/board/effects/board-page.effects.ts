import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import {
  debounceTime,
  filter,
  map,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs';
import { BoardPageActions } from '../actions/board-page.actions';
import { BoardApiService } from '../../../services/board-api.service';
import { boardPageFeature } from '../reducers/boardPage.reducer';
import { filterNil } from '../../../commons/operators/filter-nil';
import { ActivatedRoute } from '@angular/router';
import { BoardFacade } from '../../../services/board-facade.service';
import { isBoardTuNode, isSettings } from '@tapiz/board-commons';
import { getNodeSize } from '../../../shared/node-size';
import { getRouterSelectors } from '@ngrx/router-store';
import { BoardActions } from '../actions/board.actions';
export const { selectQueryParam } = getRouterSelectors();

@Injectable()
export class BoardPageEffects {
  #actions$ = inject(Actions);
  #store = inject(Store);
  #boardApiService = inject(BoardApiService);
  #route = inject(ActivatedRoute);
  #boardFacade = inject(BoardFacade);

  goToNode$ = createEffect(() => {
    return this.#actions$.pipe(
      ofType(BoardPageActions.goToNode),
      map(({ nodeId }) => {
        const nodes = this.#boardFacade.nodes();
        return nodes.find((it) => it.id === nodeId);
      }),
      filterNil(),
      filter((node) => isBoardTuNode(node)),
      concatLatestFrom(() => [this.#store.select(boardPageFeature.selectZoom)]),
      map(([node, zoom]) => {
        const { width, height } = getNodeSize(node);

        const x =
          -node.content.position.x * zoom +
          document.body.clientWidth / 2 -
          (width / 2) * zoom;
        const y =
          -node.content.position.y * zoom +
          document.body.clientHeight / 2 -
          (height / 2) * zoom;

        return BoardPageActions.setUserView({
          zoom,
          position: {
            x,
            y,
          },
        });
      }),
    );
  });

  goToNoteResetPopup$ = createEffect(() => {
    return this.#actions$.pipe(
      ofType(BoardPageActions.goToNode),
      map(() => {
        return BoardPageActions.setPopupOpen({
          popup: '',
        });
      }),
    );
  });

  saveLastUserView$ = createEffect(
    () => {
      return this.#actions$.pipe(
        ofType(BoardPageActions.setUserView),
        debounceTime(500),
        withLatestFrom(this.#store.select(boardPageFeature.selectBoardId)),
        tap(([action, boardId]) => {
          localStorage.setItem(
            `lastUserView-${boardId}`,
            JSON.stringify({
              zoom: action.zoom,
              position: action.position,
            }),
          );
        }),
      );
    },
    { dispatch: false },
  );

  restoreUserView$ = createEffect(() => {
    return this.#actions$.pipe(
      ofType(BoardPageActions.fetchBoardSuccess),
      switchMap(() => {
        return this.#actions$.pipe(ofType(BoardActions.setState)).pipe(take(1));
      }),
      withLatestFrom(
        this.#store.select(boardPageFeature.selectBoardId),
        this.#store.select(selectQueryParam('nodeId')),
      ),
      filter(([, , nodeId]) => !nodeId),
      map(([, boardId]) => {
        const lastUserView = localStorage.getItem(`lastUserView-${boardId}`);
        const params = this.#route.snapshot.queryParams;
        let zoom = 1;
        let position = { x: 0, y: 0 };

        if (lastUserView) {
          const lastUserViewParse = JSON.parse(lastUserView);

          zoom = lastUserViewParse.zoom;
          position = lastUserViewParse.position;
        } else {
          const settings = this.#boardFacade
            .nodes()
            .find((it) => isSettings(it));

          if (settings?.content?.boardStartingView) {
            position = settings.content.boardStartingView;
            zoom = settings.content.boardStartingView.zoom;
          }
        }

        if (params['position']) {
          const urlPosition = params['position'].split(',');

          position = {
            x: Number(urlPosition[0]),
            y: Number(urlPosition[1]),
          };
        }

        if (params['zoom']) {
          zoom = Number(params['zoom']);
        }

        return {
          position,
          zoom,
        };
      }),
      filterNil(),
      map(({ zoom, position }) => {
        return BoardPageActions.setUserView({
          zoom,
          position,
        });
      }),
    );
  });

  setBoardPrivacy$ = createEffect(
    () => {
      return this.#actions$.pipe(
        ofType(BoardPageActions.setBoardPrivacy),
        concatLatestFrom(() => [
          this.#store.select(boardPageFeature.selectBoardId),
        ]),
        switchMap(([{ isPublic }, boardId]) => {
          return this.#boardApiService.setBoardPrivacy(boardId, isPublic);
        }),
      );
    },
    { dispatch: false },
  );

  goToUser$ = createEffect(() => {
    return this.#actions$.pipe(
      ofType(BoardPageActions.goToUser),
      map(({ id }) => {
        const user = this.#boardFacade
          .usersNodes()
          .find((it) => it.id === id)?.content;

        if (user?.position && user?.zoom) {
          return BoardPageActions.setUserView({
            zoom: user.zoom,
            position: user.position,
          });
        }

        return null;
      }),
      filterNil(),
    );
  });

  fetchMentions$ = createEffect(() => {
    return this.#actions$.pipe(
      ofType(
        BoardPageActions.fetchMentions,
        BoardPageActions.fetchBoardSuccess,
        BoardPageActions.newUserJoined,
      ),
      concatLatestFrom(() => [
        this.#store.select(boardPageFeature.selectBoardId),
      ]),
      switchMap(([, boardId]) => {
        return this.#boardApiService.getBoardMentions(boardId).pipe(
          map((mentions) => {
            return BoardPageActions.fetchMentionsSuccess({ mentions });
          }),
        );
      }),
    );
  });

  mentionUser$ = createEffect(
    () => {
      return this.#actions$.pipe(
        ofType(BoardPageActions.mentionUser),
        concatLatestFrom(() => [
          this.#store.select(boardPageFeature.selectBoardId),
          this.#store.select(boardPageFeature.selectUserId),
        ]),
        filter(([{ userId }, , currentUserId]) => userId !== currentUserId),
        switchMap(([{ userId, nodeId }, boardId]) => {
          return this.#boardApiService.mentionBoardUser(
            boardId,
            userId,
            nodeId,
          );
        }),
      );
    },
    { dispatch: false },
  );

  deleteMember$ = createEffect(
    () => {
      return this.#actions$.pipe(
        ofType(BoardPageActions.deleteMember),
        concatLatestFrom(() => [
          this.#store.select(boardPageFeature.selectBoardId),
        ]),
        switchMap(([{ userId }, boardId]) => {
          return this.#boardApiService.deleteMember(boardId, userId);
        }),
      );
    },
    { dispatch: false },
  );

  changeRole$ = createEffect(
    () => {
      return this.#actions$.pipe(
        ofType(BoardPageActions.changeRole),
        concatLatestFrom(() => [
          this.#store.select(boardPageFeature.selectBoardId),
        ]),
        switchMap(([{ userId, role }, boardId]) => {
          return this.#boardApiService.changeRole(boardId, userId, role);
        }),
      );
    },
    { dispatch: false },
  );
}
