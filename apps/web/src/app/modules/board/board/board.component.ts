import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  AfterViewInit,
  HostListener,
  OnDestroy,
  inject,
  DestroyRef,
  computed,
  viewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { rxEffect } from 'ngxtension/rx-effect';
import {
  animationFrameScheduler,
  combineLatest,
  fromEvent,
  merge,
  Subject,
} from 'rxjs';
import {
  map,
  withLatestFrom,
  filter,
  take,
  throttleTime,
  pairwise,
  switchMap,
  startWith,
} from 'rxjs/operators';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BoardActions } from '../actions/board.actions';
import { BoardPageActions } from '../actions/board-page.actions';
import { BoardMoveService } from '../services/board-move.service';
import { BoardZoomService } from '../services/board-zoom.service';
import { ActivatedRoute } from '@angular/router';
import { NotesService } from '../services/notes.service';
import { CursorsComponent } from '../components/cursors/cursors.component';
import { ZoneComponent } from '../components/zone/zone.component';
import { OverlayComponent } from '../components/overlay/overlay.component';
import { CommonModule } from '@angular/common';
import { BoardToolbarComponent } from '../components/board-toolbar/board-toolbar.component';
import { UsersComponent } from '../components/users/users.component';
import { HeaderComponent } from '../components/header/header.component';
import { SearchOptionsComponent } from '../components/search-options/search-options.component';
import { CopyPasteDirective } from '../directives/copy-paste.directive';
import { TitleComponent } from '../../../shared/title/title.component';
import { Point, StateActions } from '@tapiz/board-commons';
import { boardPageFeature } from '../reducers/boardPage.reducer';
import { MatDialogModule } from '@angular/material/dialog';
import { NodesComponent } from '../components/nodes/nodes.component';
import { ContextMenuComponent } from '@tapiz/ui/context-menu/context-menu.component';
import { ContextMenuStore } from '@tapiz/ui/context-menu/context-menu.store';
import { BoardContextMenuComponent } from '../components/board-context-menu/board-contextmenu.component';
import { HistoryService } from '../services/history.service';
import { MoveService } from '@tapiz/cdk/services/move.service';
import { RotateService } from '@tapiz/ui/rotate/rotate.service';
import { WsService } from '../../ws/services/ws.service';
import { FollowUserComponent } from '../../../shared/follow-user/follow-user.component';
import { StopHighlightComponent } from '../../../shared/stop-highlight/stop-highlight';
import { BoardFacade } from '../../../services/board-facade.service';
import { appFeature } from '../../../+state/app.reducer';
import { SubscriptionService } from '../../../services/subscription.service';
import { DrawingStore } from '../components/drawing/drawing.store';
import { DrawingOptionsComponent } from '../components/drawing-options';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { CommentsComponent } from '../components/comments/comments.component';
import { NodesActions } from '../services/nodes-actions';
import { ConfigService } from '../../../services/config.service';
import { FileUploadService } from '../../../services/file-upload.service';
import { DemoIntroComponent } from '../components/demo-intro/demo-intro.component';
import { filterNil } from 'ngxtension/filter-nil';
import { ZoomControlComponent } from '../components/zoom-control/zoom-control.component';
import { BoardNodesAlignComponent } from '../components/board-nodes-align/board-nodes-align.component';
import { LiveReactionWallComponent } from '../components/live-reaction/live-reaction-wall.component';
import { BoardShourtcutsDirective } from '../directives/board-shortcuts.directive';
import { PopupPortalComponent } from '@tapiz/ui/popup/popup-portal.component';
import { NotesVisibilityComponent } from '../components/notes-visibility/notes-visibility.component';
import { NoteHeightCalculatorComponent } from '../components/note/components/note-height-calculator/note-height-calculator.component';
import { BoardDragDirective } from './directives/board-drag.directive';
import { BoardHeaderOptionsComponent } from '../components/board-header-options/board-header-options.component';
import { BoardResizeDirective } from './directives/board-resize.directive';
import { TimerComponent } from '../components/timer/timer.component';
import { PortalTargetComponent } from '@tapiz/ui/portal';
import type { WsEvents } from '@tapiz/board-commons/models/ws-events.model';
import {
  defaultBackgroundColor,
  defaultDotsColor,
} from '../components/board-settings/board-settings.component';
import { SetBoardCenterComponent } from '../components/set-board-center/set-board-center.component';

@Component({
  selector: 'tapiz-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DrawingStore],
  imports: [
    CommonModule,
    HeaderComponent,
    UsersComponent,
    BoardToolbarComponent,
    OverlayComponent,
    ZoneComponent,
    CursorsComponent,
    DrawingOptionsComponent,
    SearchOptionsComponent,
    TitleComponent,
    FollowUserComponent,
    MatDialogModule,
    StopHighlightComponent,
    MatProgressBarModule,
    NodesComponent,
    ContextMenuComponent,
    BoardContextMenuComponent,
    CommentsComponent,
    DemoIntroComponent,
    ZoomControlComponent,
    BoardNodesAlignComponent,
    LiveReactionWallComponent,
    PopupPortalComponent,
    NotesVisibilityComponent,
    NoteHeightCalculatorComponent,
    BoardHeaderOptionsComponent,
    TimerComponent,
    PortalTargetComponent,
    SetBoardCenterComponent,
  ],
  hostDirectives: [
    CopyPasteDirective,
    BoardShourtcutsDirective,
    BoardDragDirective,
    BoardResizeDirective,
  ],
  host: {
    '[class.node-selection-disabled]': '!nodeSelectionEnabled()',
    '[class.readonly]': 'isReadonlyUser()',
    '[class.edit-mode]': 'boardMode() === 1',
    '[class.following-user]': 'followUser()',
  },
})
export class BoardComponent implements AfterViewInit, OnDestroy {
  public el = inject(ElementRef);
  private wsService = inject(WsService);
  private store = inject(Store);
  private boardZoomService = inject(BoardZoomService);
  private boardMoveService = inject(BoardMoveService);
  private route = inject(ActivatedRoute);
  private notesService = inject(NotesService);
  private boardFacade = inject(BoardFacade);
  private contextMenuStore = inject(ContextMenuStore);
  private moveService = inject(MoveService);
  private rotateService = inject(RotateService);
  private subscriptionService = inject(SubscriptionService);
  private drawingStore = inject(DrawingStore);
  private nodesActions = inject(NodesActions);
  private configService = inject(ConfigService);
  private fileUploadService = inject(FileUploadService);
  private destroyRef = inject(DestroyRef);
  public readonly boardId$ = this.store.select(boardPageFeature.selectBoardId);

  smallScale = computed(() => this.calcPatterns().smallCalc);
  bigScale = computed(() => this.calcPatterns().bigCalc);
  public readonly userZoom = this.store.selectSignal(
    boardPageFeature.selectZoom,
  );
  public readonly historyService = inject(HistoryService);
  public readonly newNote$ = new Subject<MouseEvent>();
  public readonly drawing = this.drawingStore.drawing;
  public readonly search = this.store.selectSignal(
    boardPageFeature.selectSearching,
  );
  public readonly boardTitle = this.store.selectSignal(
    boardPageFeature.selectName,
  );
  public readonly followUser = this.store.selectSignal(
    boardPageFeature.selectFollow,
  );
  public readonly loaded = this.store.selectSignal(
    boardPageFeature.selectLoaded,
  );
  public readonly userId = this.store.selectSignal(
    boardPageFeature.selectUserId,
  );
  public readonly boardMode = this.store.selectSignal(
    boardPageFeature.selectBoardMode,
  );
  public readonly nodeSelectionEnabled = this.store.selectSignal(
    boardPageFeature.selectIsNodeSelectionEnabled,
  );
  public readonly loadingBar = this.store.selectSignal(
    boardPageFeature.selectLoadingBar,
  );
  public readonly isAdmin = this.store.selectSignal(
    boardPageFeature.selectIsAdmin,
  );
  public readonly readonly = computed(() => {
    return this.boardFacade.settings()?.content.readOnly ?? false;
  });
  public readonly backgroundColor = computed(() => {
    return (
      this.boardFacade.settings()?.content.backgroundColor ??
      defaultBackgroundColor
    );
  });

  public readonly dotsColor = computed(() => {
    return this.boardFacade.settings()?.content.dotsColor ?? defaultDotsColor;
  });

  public readonly isReadonlyUser = computed(() => {
    return this.readonly() && !this.isAdmin();
  });

  anonymousMode = computed(() => {
    return this.#boardFacade.settings()?.content.anonymousMode;
  });

  workLayer = viewChild.required<ElementRef<HTMLElement>>('workLayer');

  dots = viewChild.required<ElementRef<HTMLElement>>('dots');
  #boardFacade = inject(BoardFacade);
  timer = this.#boardFacade.timer;
  contextMenuOpen$ = toObservable(this.contextMenuStore.state.open);

  @HostListener('dblclick', ['$event'])
  public dblclick(event: MouseEvent) {
    if (this.isReadonlyUser()) {
      return;
    }

    if (event.target !== this.el.nativeElement) {
      return;
    }

    this.newNote$.next(event);
  }

  calcPatterns = computed(() => {
    let smallCalc = 0;
    let bigCalc = 0;
    const zoom = Math.max(this.userZoom(), 0.1);
    const constant = 0.3;
    const baseSize = 0.8;
    const total = baseSize + constant / zoom;

    smallCalc = Math.min(total, 2.5);
    const zoomFactor = Math.max(this.userZoom(), 0.1);

    const smallMinSize = 18;
    const smallMaxSize = 45;
    smallCalc =
      smallMinSize +
      ((smallMaxSize - smallMinSize) * (zoomFactor - 0.1)) / (1 - 0.1);
    smallCalc = Math.min(smallCalc, smallMaxSize);

    const bigMinSize = 300;
    const bigMaxSize = 1600;
    bigCalc =
      bigMinSize + ((bigMaxSize - bigMinSize) * (zoomFactor - 0.1)) / (1 - 0.1);
    bigCalc = Math.max(bigCalc, bigMinSize);

    return { smallCalc: smallCalc, bigCalc: bigCalc };
  });

  constructor() {
    if (sessionStorage.getItem('new-board')) {
      sessionStorage.removeItem('new-board');
      this.store.dispatch(BoardPageActions.changeBoardMode({ boardMode: 1 }));
    }

    this.wsService.reconnect$.pipe(takeUntilDestroyed()).subscribe(() => {
      const boardId = this.route.snapshot.paramMap.get('id');

      if (boardId) {
        this.store.dispatch(BoardPageActions.joinBoard({ boardId }));
      }
    });

    rxEffect(
      this.contextMenuOpen$.pipe(
        pairwise(),
        filter(([prev, curr]) => prev !== curr),
        map(([, curr]) => {
          return curr;
        }),
      ),
      {
        next: (open) => {
          this.store.dispatch(
            BoardPageActions.lockBoard({
              lock: open,
            }),
          );
        },
      },
    );

    this.historyService.event$.pipe(takeUntilDestroyed()).subscribe((event) => {
      this.store.dispatch(BoardPageActions.nodeSnapshot(event));
    });

    this.rotateService.onStart$.pipe(takeUntilDestroyed()).subscribe((node) => {
      this.boardFacade.patchHistory((history) => {
        const nodeAction: StateActions = {
          data: node,
          op: 'patch',
        };
        history.past.unshift([nodeAction]);
        history.future = [];

        return history;
      });
    });

    this.rotateService.onRotate$
      .pipe(takeUntilDestroyed())
      .subscribe((node) => {
        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: false,
            actions: [this.nodesActions.patch(node)],
          }),
        );
      });

    this.moveService.setUp({
      zoom: this.store.select(boardPageFeature.selectZoom),
      relativePosition: this.store.select(boardPageFeature.selectPosition),
    });

    this.store
      .select(appFeature.selectUserId)
      .pipe(filterNil(), take(1))
      .subscribe((userId) => {
        this.store.dispatch(
          BoardPageActions.initBoard({
            userId,
          }),
        );
      });

    const boardId = this.route.snapshot.paramMap.get('id');

    if (boardId) {
      const boardSub = this.subscriptionService.sub<WsEvents>('board', boardId);

      boardSub
        .pipe(
          filter((event) => event.event === 'changeRoleBoard'),
          takeUntilDestroyed(),
        )
        .subscribe(() => {
          this.store.dispatch(BoardPageActions.userRoleChanged());
        });

      boardSub
        .pipe(
          filter((event) => event.event !== 'changeRoleBoard'),
          takeUntilDestroyed(),
        )
        .subscribe(() => {
          this.store.dispatch(BoardPageActions.refetchBoard());
        });
    }
  }

  public initBoard() {
    const updateUserPosition = (
      position: Point,
      mousePosition: Point,
      zoom: number,
    ) => {
      const action = {
        data: {
          type: 'user',
          id: this.userId(),
          content: {
            position: {
              x: Math.round(position.x),
              y: Math.round(position.y),
            },
            cursor: {
              x: Math.round((-position.x + mousePosition.x) / zoom),
              y: Math.round((-position.y + mousePosition.y) / zoom),
            },
            zoom: Math.round(zoom * 100) / 100,
          },
        },
        op: 'patch',
      };

      this.wsService.send([action]);
    };

    fromEvent<MouseEvent>(this.el.nativeElement, 'wheel', { passive: false })
      .pipe(
        filter((event: MouseEvent) => event.ctrlKey),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event: MouseEvent) => {
        event.preventDefault();
      });

    this.store
      .select(boardPageFeature.selectCurrentBoardCursor)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cursor) => {
        this.el.nativeElement.style.setProperty('--default-cursor', cursor);

        if (cursor === 'text') {
          this.el.nativeElement.classList.add('cursor-text');
        } else {
          this.el.nativeElement.classList.remove('cursor-text');
        }
      });

    this.newNote$
      .pipe(
        withLatestFrom(
          this.store.select(boardPageFeature.selectZoom),
          this.store.select(boardPageFeature.selectPosition),
          this.store.select(boardPageFeature.selectUserId),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([event, zoom, position, userId]) => {
        this.notesService.createNote(userId, {
          x: (-position.x + event.clientX) / zoom,
          y: (-position.y + event.clientY) / zoom,
        });
      });

    this.boardMoveService.listen(this.el.nativeElement);

    this.boardMoveService.mouseDown$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.store.dispatch(BoardPageActions.setFocusId({ focusId: '' }));
      });

    this.boardMoveService.mouseMove$
      .pipe(
        withLatestFrom(
          this.store.select(boardPageFeature.selectZoom),
          this.store.select(boardPageFeature.selectPosition),
        ),
        throttleTime(0, animationFrameScheduler),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([mousePosition, zoom, position]) => {
        updateUserPosition(position, mousePosition, zoom);
      });

    const userView$ = merge(
      this.boardZoomService.zoomMove$,
      this.boardMoveService.boardMove$.pipe(
        withLatestFrom(this.store.select(boardPageFeature.selectZoom)),
      ),
    ).pipe(
      map(([move, zoom]) => {
        return {
          move,
          zoom,
        };
      }),
    );
    this.boardMoveService.move$
      .pipe(
        withLatestFrom(
          this.store.select(boardPageFeature.selectDragInProgress),
          this.store.select(boardPageFeature.selectMoveEnabled),
        ),
        filter(([, inProgress, moveEnabled]) => !inProgress && moveEnabled),
        switchMap(() => {
          this.store.dispatch(
            BoardPageActions.dragInProgress({ inProgress: true }),
          );

          return this.boardMoveService.mouseUp$.pipe(take(1));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.store.dispatch(
          BoardPageActions.dragInProgress({ inProgress: false }),
        );
      });

    userView$
      .pipe(
        withLatestFrom(
          this.boardMoveService.mouseMove$.pipe(startWith({ x: 0, y: 0 })),
          this.store.select(boardPageFeature.selectMoveEnabled),
        ),
        filter(([, , moveEnabled]) => {
          return moveEnabled;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([{ move, zoom }, mousePosition]) => {
        this.store.dispatch(
          BoardPageActions.setUserView({
            zoom,
            position: {
              x: Math.round(move.x),
              y: Math.round(move.y),
            },
          }),
        );

        updateUserPosition(move, mousePosition, zoom);
      });

    combineLatest([
      this.store.select(boardPageFeature.selectZoom),
      this.store.select(boardPageFeature.selectPosition),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([zoom, position]) => {
        this.workLayerNativeElement.style.transform = `translate(${position.x}px, ${position.y}px) scale(${zoom})`;

        this.dots().nativeElement.style.transform = `translate(${position.x}px, ${position.y}px)`;
      });
  }

  @HostListener('dragover', ['$event']) onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  @HostListener('drop', ['$event']) public ondrop(event: DragEvent) {
    event.preventDefault();
    const droppedFiles = event.dataTransfer?.files;

    if (droppedFiles) {
      this.fileUploadService.addFilesToBoard(Array.from(droppedFiles), {
        x: event.clientX,
        y: event.clientY,
      });
    }
  }

  get workLayerNativeElement() {
    return this.workLayer().nativeElement;
  }

  get isDemo() {
    return !!this.configService.config.DEMO;
  }

  public connect() {
    const boardId = this.route.snapshot.paramMap.get('id');

    if (boardId) {
      this.store.dispatch(BoardPageActions.joinBoard({ boardId }));
      this.initBoard();
    }
  }

  public ngAfterViewInit() {
    this.connect();
  }

  public ngOnDestroy() {
    this.store.dispatch(BoardPageActions.closeBoard());
  }
}
