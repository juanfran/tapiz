import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import {
  debounceTime,
  filter,
  map,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';
import { BoardPageActions } from '../actions/board-page.actions';
import { BoardApiService } from '../../../services/board-api.service';
import { boardPageFeature } from '../reducers/boardPage.reducer';
import { filterNil } from '../../../commons/operators/filter-nil';
import { ActivatedRoute } from '@angular/router';
import { BoardFacade } from '../../../services/board-facade.service';
import { Point, TuNode } from '@tapiz/board-commons';
import { getNodeSize } from '../../../shared/node-size';
import { getRouterSelectors } from '@ngrx/router-store';
export const { selectQueryParam } = getRouterSelectors();

@Injectable()
export class BoardPageEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private boardApiService = inject(BoardApiService);
  private route = inject(ActivatedRoute);
  private boardFacade = inject(BoardFacade);
  public initBoardCocomaterialTags$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BoardPageActions.initBoard),
      concatLatestFrom(() => [
        this.store.select(boardPageFeature.selectCocomaterial),
      ]),
      filter(([, cocomaterial]) => !cocomaterial.tags.length),
      switchMap(() => {
        return this.boardApiService.getCocomaterialTags().pipe(
          map((tags) => {
            return BoardPageActions.fetchCocomaterialTagsSuccess({ tags });
          }),
        );
      }),
    );
  });

  public fetchCocomaterialVectos$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BoardPageActions.fetchVectors),
      concatLatestFrom(() => [
        this.store.select(boardPageFeature.selectCocomaterial),
      ]),
      switchMap(([{ tags }]) => {
        return this.boardApiService.getCocomaterialVectors(1, 60, tags).pipe(
          map((vectors) => {
            return BoardPageActions.fetchVectorsSuccess({
              vectors,
              page: 1,
            });
          }),
        );
      }),
    );
  });

  public nextVectorsPage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BoardPageActions.nextVectorsPage),
      concatLatestFrom(() => [
        this.store.select(boardPageFeature.selectCocomaterial),
      ]),
      switchMap(([{ tags }, cocomaterial]) => {
        return this.boardApiService
          .getCocomaterialVectors(cocomaterial.page + 1, 60, tags)
          .pipe(
            map((vectors) => {
              return BoardPageActions.fetchVectorsSuccess({
                vectors,
                page: cocomaterial.page + 1,
              });
            }),
          );
      }),
    );
  });

  public goToNode$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BoardPageActions.goToNode),
      map(({ nodeId }) => {
        const nodes = this.boardFacade.nodes();
        return nodes.find((it) => it.id === nodeId) as TuNode<{
          position: Point;
          width?: number;
          height?: number;
        }>;
      }),
      filterNil(),
      concatLatestFrom(() => [this.store.select(boardPageFeature.selectZoom)]),
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

  public goToNoteResetPopup$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BoardPageActions.goToNode),
      map(() => {
        return BoardPageActions.setPopupOpen({
          popup: '',
        });
      }),
    );
  });

  public saveLastUserView$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BoardPageActions.setUserView),
        debounceTime(500),
        withLatestFrom(this.store.select(boardPageFeature.selectBoardId)),
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

  public restoreUserView$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BoardPageActions.fetchBoardSuccess),
      withLatestFrom(
        this.store.select(boardPageFeature.selectBoardId),
        this.store.select(selectQueryParam('nodeId')),
      ),
      filter(([, , nodeId]) => !nodeId),
      map(([, boardId]) => {
        const lastUserView = localStorage.getItem(`lastUserView-${boardId}`);
        const params = this.route.snapshot.queryParams;
        let zoom = 1;
        let position = { x: 0, y: 0 };

        if (lastUserView) {
          const lastUserViewParse = JSON.parse(lastUserView);

          zoom = lastUserViewParse.zoom;
          position = lastUserViewParse.position;
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

  public setBoardPrivacy$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BoardPageActions.setBoardPrivacy),
        concatLatestFrom(() => [
          this.store.select(boardPageFeature.selectBoardId),
        ]),
        switchMap(([{ isPublic }, boardId]) => {
          return this.boardApiService.setBoardPrivacy(boardId, isPublic);
        }),
      );
    },
    { dispatch: false },
  );

  public goToUser$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BoardPageActions.goToUser),
      map(({ id }) => {
        const user = this.boardFacade
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

  public fetchMentions$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(
        BoardPageActions.fetchMentions,
        BoardPageActions.fetchBoardSuccess,
        BoardPageActions.newUserJoined,
      ),
      concatLatestFrom(() => [
        this.store.select(boardPageFeature.selectBoardId),
      ]),
      switchMap(([, boardId]) => {
        return this.boardApiService.getBoardMentions(boardId).pipe(
          map((mentions) => {
            return BoardPageActions.fetchMentionsSuccess({ mentions });
          }),
        );
      }),
    );
  });

  public mentionUser$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BoardPageActions.mentionUser),
        concatLatestFrom(() => [
          this.store.select(boardPageFeature.selectBoardId),
        ]),
        switchMap(([{ userId, nodeId }, boardId]) => {
          return this.boardApiService.mentionBoardUser(boardId, userId, nodeId);
        }),
      );
    },
    { dispatch: false },
  );
}
