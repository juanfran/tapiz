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
import { PageActions } from '../actions/page.actions';
import { selectBoardId, selectCocomaterial } from '../selectors/page.selectors';
import { BoardApiService } from '../../../services/board-api.service';
import { pageFeature } from '../reducers/page.reducer';
import { filterNil } from '../../../commons/operators/filter-nil';
import { ActivatedRoute } from '@angular/router';
import { BoardFacade } from '../../../services/board-facade.service';
import { Point, TuNode } from '@tapiz/board-commons';
import { getNodeSize } from '../../../shared/node-size';
import { getRouterSelectors } from '@ngrx/router-store';
export const { selectQueryParam } = getRouterSelectors();

@Injectable()
export class PageEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private boardApiService = inject(BoardApiService);
  private route = inject(ActivatedRoute);
  private boardFacade = inject(BoardFacade);
  public initBoardCocomaterialTags$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.initBoard),
      concatLatestFrom(() => [this.store.select(selectCocomaterial)]),
      filter(([, cocomaterial]) => !cocomaterial.tags.length),
      switchMap(() => {
        return this.boardApiService.getCocomaterialTags().pipe(
          map((tags) => {
            return PageActions.fetchCocomaterialTagsSuccess({ tags });
          }),
        );
      }),
    );
  });

  public fetchCocomaterialVectos$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.fetchVectors),
      concatLatestFrom(() => [this.store.select(selectCocomaterial)]),
      switchMap(([{ tags }]) => {
        return this.boardApiService.getCocomaterialVectors(1, 60, tags).pipe(
          map((vectors) => {
            return PageActions.fetchVectorsSuccess({
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
      ofType(PageActions.nextVectorsPage),
      concatLatestFrom(() => [this.store.select(selectCocomaterial)]),
      switchMap(([{ tags }, cocomaterial]) => {
        return this.boardApiService
          .getCocomaterialVectors(cocomaterial.page + 1, 60, tags)
          .pipe(
            map((vectors) => {
              return PageActions.fetchVectorsSuccess({
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
      ofType(PageActions.goToNode),
      concatLatestFrom(() => [this.boardFacade.getNodes()]),
      map(([{ nodeId }, nodes]) => {
        return nodes.find((it) => it.id === nodeId) as TuNode<{
          position: Point;
          width?: number;
          height?: number;
        }>;
      }),
      filterNil(),
      concatLatestFrom(() => [this.store.select(pageFeature.selectZoom)]),
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

        return PageActions.setUserView({
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
      ofType(PageActions.goToNode),
      map(() => {
        return PageActions.setPopupOpen({
          popup: '',
        });
      }),
    );
  });

  public saveLastUserView$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(PageActions.setUserView),
        debounceTime(500),
        withLatestFrom(this.store.select(selectBoardId)),
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
      ofType(PageActions.fetchBoardSuccess),
      withLatestFrom(
        this.store.select(selectBoardId),
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
        return PageActions.setUserView({
          zoom,
          position,
        });
      }),
    );
  });

  public setBoardPrivacy$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(PageActions.setBoardPrivacy),
        concatLatestFrom(() => [this.store.select(selectBoardId)]),
        switchMap(([{ isPublic }, boardId]) => {
          return this.boardApiService.setBoardPrivacy(boardId, isPublic);
        }),
      );
    },
    { dispatch: false },
  );

  public goToUser$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.goToUser),
      switchMap(({ id }) => {
        return this.boardFacade.getUsers().pipe(
          map((users) => {
            return users.find((user) => user.id === id)?.content;
          }),
          take(1),
        );
      }),
      map((user) => {
        if (user?.position && user?.zoom) {
          return PageActions.setUserView({
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
        PageActions.fetchMentions,
        PageActions.fetchBoardSuccess,
        PageActions.newUserJoined,
      ),
      concatLatestFrom(() => [this.store.select(selectBoardId)]),
      switchMap(([, boardId]) => {
        return this.boardApiService.getBoardMentions(boardId).pipe(
          map((mentions) => {
            return PageActions.fetchMentionsSuccess({ mentions });
          }),
        );
      }),
    );
  });

  public mentionUser$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(PageActions.mentionUser),
        concatLatestFrom(() => [this.store.select(selectBoardId)]),
        switchMap(([{ userId, nodeId }, boardId]) => {
          return this.boardApiService.mentionBoardUser(boardId, userId, nodeId);
        }),
      );
    },
    { dispatch: false },
  );
}
