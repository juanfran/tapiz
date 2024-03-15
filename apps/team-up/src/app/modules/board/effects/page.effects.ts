import { Injectable } from '@angular/core';
import { Actions, concatLatestFrom, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  filter,
  map,
  switchMap,
  take,
  tap,
  throttleTime,
  withLatestFrom,
} from 'rxjs';
import { PageActions } from '../actions/page.actions';
import { selectBoardId, selectCocomaterial } from '../selectors/page.selectors';
import { BoardApiService } from '../../../services/board-api.service';
import { pageFeature } from '../reducers/page.reducer';
import { filterNil } from '../../../commons/operators/filter-nil';
import { ActivatedRoute } from '@angular/router';
import { BoardFacade } from '../../../services/board-facade.service';
import { Point, TuNode } from '@team-up/board-commons';

@Injectable()
export class PageEffects {
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
        let width = node.content.width;
        let height = node.content.height;

        const nodeWidths = {
          note: 300,
          poll: 650,
        } as Record<string, number>;

        width ??= nodeWidths[node.type] || 0;
        height ??= width;

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
        throttleTime(500),
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
      withLatestFrom(this.store.select(selectBoardId)),
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

  constructor(
    private actions$: Actions,
    private store: Store,
    private boardApiService: BoardApiService,
    private route: ActivatedRoute,
    private boardFacade: BoardFacade,
  ) {}
}
