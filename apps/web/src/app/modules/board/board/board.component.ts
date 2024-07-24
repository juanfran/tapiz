import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  HostListener,
  OnDestroy,
  HostBinding,
  inject,
  DestroyRef,
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
} from 'rxjs/operators';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BoardActions } from '../actions/board.actions';
import { PageActions } from '../actions/page.actions';

import {
  selectMoveEnabled,
  selectPosition,
  selectBoardId,
  selectUserId,
  selectZoom,
  selectSearching,
  selectDragEnabled,
} from '../selectors/page.selectors';

import { BoardMoveService } from '../services/board-move.service';
import { BoardZoomService } from '../services/board-zoom.service';
import { ActivatedRoute } from '@angular/router';
import { NotesService } from '../services/notes.service';
import { BoardDragDirective } from '../directives/board-drag.directive';
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
import { Drawing, Point, StateActions, TuNode } from '@tapiz/board-commons';
import { pageFeature } from '../reducers/page.reducer';
import { MatDialogModule } from '@angular/material/dialog';
import { NodesComponent } from '../components/nodes/nodes.component';
import { MultiDragService } from '@tapiz/cdk/services/multi-drag.service';
import { ContextMenuComponent } from '@tapiz/ui/context-menu/context-menu.component';
import { ContextMenuStore } from '@tapiz/ui/context-menu/context-menu.store';
import { BoardContextMenuComponent } from '../components/board-context-menu/board-contextmenu.component';
import { HistoryService } from '@tapiz/nodes/services/history.service';
import { MoveService } from '@tapiz/cdk/services/move.service';
import { ResizeService } from '@tapiz/ui/resize/resize.service';
import { RotateService } from '@tapiz/ui/rotate/rotate.service';
import { NodeToolbarComponent } from '../components/node-toolbar/node-toolbar.component';
import { WsService } from '../../ws/services/ws.service';
import { FollowUserComponent } from '../../../shared/follow-user/follow-user.component';
import { StopHighlightComponent } from '../../../shared/stop-highlight/stop-highlight';
import { BoardFacade } from '../../../services/board-facade.service';
import { appFeature } from '../../../+state/app.reducer';
import { SubscriptionService } from '../../../services/subscription.service';
import { DrawingStore } from '@tapiz/board-components/drawing/drawing.store';
import { DrawingOptionsComponent } from '@tapiz/board-components/drawing-options';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { CommentsComponent } from '@tapiz/nodes/comments/comments.component';
import { NodesActions } from '@tapiz/nodes/services/nodes-actions';
import { ConfigService } from '../../../services/config.service';
import { FileUploadService } from '../../../services/file-upload.service';
import { DemoIntroComponent } from '../components/demo-intro/demo-intro.component';
import { filterNil } from 'ngxtension/filter-nil';
import { ZoomControlComponent } from '../components/zoom-control/zoom-control.component';
import { BoardNodesAlignComponent } from '../components/board-nodes-align/board-nodes-align.component';
import { LiveReactionWallComponent } from '../components/live-reaction/live-reaction-wall.component';
import { BoardEditorPortalComponent } from '../components/board-editor-portal/board-editor-portal.component';
import { BoardShourtcutsDirective } from '../directives/board-shortcuts.directive';

@Component({
  selector: 'tapiz-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DrawingStore],
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    UsersComponent,
    BoardToolbarComponent,
    OverlayComponent,
    ZoneComponent,
    CursorsComponent,
    BoardDragDirective,
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
    NodeToolbarComponent,
    CommentsComponent,
    DemoIntroComponent,
    ZoomControlComponent,
    BoardNodesAlignComponent,
    LiveReactionWallComponent,
    BoardEditorPortalComponent,
  ],
  hostDirectives: [CopyPasteDirective, BoardShourtcutsDirective],
  host: {
    '[class.node-selection-disabled]': '!nodeSelectionEnabled()',
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
  private multiDragService = inject(MultiDragService);
  private contextMenuStore = inject(ContextMenuStore);
  private moveService = inject(MoveService);
  private resizeService = inject(ResizeService);
  private rotateService = inject(RotateService);
  private subscriptionService = inject(SubscriptionService);
  private drawingStore = inject(DrawingStore);
  private nodesActions = inject(NodesActions);
  private configService = inject(ConfigService);
  private fileUploadService = inject(FileUploadService);
  private destroyRef = inject(DestroyRef);
  private boardShourtcutsDirective = inject(BoardShourtcutsDirective);
  public readonly boardId$ = this.store.select(selectBoardId);
  public readonly nodes$ = this.boardFacade.getNodes();

  public readonly historyService = inject(HistoryService);
  public readonly newNote$ = new Subject<MouseEvent>();
  public readonly drawing = this.drawingStore.drawing;
  public readonly search = this.store.selectSignal(selectSearching);
  public readonly boardTitle = this.store.selectSignal(pageFeature.selectName);
  public readonly folloUser = this.store.selectSignal(pageFeature.selectFollow);
  public readonly loaded = this.store.selectSignal(pageFeature.selectLoaded);
  public readonly userId = this.store.selectSignal(selectUserId);
  public readonly boardMode = this.store.selectSignal(
    pageFeature.selectBoardMode,
  );
  public readonly nodeSelectionEnabled = this.store.selectSignal(
    pageFeature.selectNodeSelection,
  );
  public readonly loadingBar = this.store.selectSignal(
    pageFeature.selectLoadingBar,
  );

  @ViewChild('workLayer', { read: ElementRef }) public workLayer!: ElementRef;

  @HostBinding('class.follow-user')
  public get isFollowUser() {
    return this.folloUser();
  }

  @HostListener('dblclick', ['$event'])
  public dblclick(event: MouseEvent) {
    if (event.target !== this.el.nativeElement) {
      return;
    }

    this.newNote$.next(event);
  }

  constructor() {
    if (sessionStorage.getItem('new-board')) {
      sessionStorage.removeItem('new-board');
      this.store.dispatch(PageActions.changeBoardMode({ boardMode: 1 }));
    }

    rxEffect(
      this.contextMenuStore.open$.pipe(
        pairwise(),
        filter(([prev, curr]) => prev !== curr),
        map(([, curr]) => {
          return curr;
        }),
      ),
      {
        next: (open) => {
          this.store.dispatch(
            PageActions.lockBoard({
              lock: open,
            }),
          );
        },
      },
    );

    this.historyService.event$.pipe(takeUntilDestroyed()).subscribe((event) => {
      this.store.dispatch(PageActions.nodeSnapshot(event));
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

    this.resizeService.onStart$.pipe(takeUntilDestroyed()).subscribe((node) => {
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

    this.resizeService.onResize$
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
      zoom: this.store.select(selectZoom),
      relativePosition: this.store.select(selectPosition),
    });

    this.multiDragService.setUp({
      dragEnabled: this.store.select(selectDragEnabled),
      zoom: this.store.select(selectZoom),
      relativePosition: this.store.select(selectPosition),
      draggableId: this.store.select(pageFeature.selectFocusId),
      nodes: () => {
        return this.boardFacade.get();
      },
      move: (elements) => {
        const nodes = elements.map(({ draggable, position }) => {
          return {
            node: {
              type: draggable.nodeType,
              id: draggable.id,
              content: {
                position,
              },
            },
          };
        });

        const actions = this.nodesActions.bulkPatch(nodes);

        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: false,
            actions,
          }),
        );
      },
      end: (dragElements) => {
        const actions = dragElements.map((action) => {
          return {
            nodeType: action.draggable.nodeType,
            id: action.draggable.id,
            initialPosition: action.initialPosition,
            initialIndex: action.initialIndex,
            finalPosition: action.finalPosition,
          };
        });
        if (actions.length) {
          this.store.dispatch(PageActions.endDragNode({ nodes: actions }));
        }
      },
    });

    this.store
      .select(appFeature.selectUserId)
      .pipe(filterNil(), take(1))
      .subscribe((userId) => {
        this.store.dispatch(
          PageActions.initBoard({
            userId,
          }),
        );
      });

    const boardId = this.route.snapshot.paramMap.get('id');

    if (boardId) {
      this.subscriptionService
        .watchBoardIds([boardId])
        .pipe(takeUntilDestroyed())
        .subscribe(() => {
          this.store.dispatch(PageActions.refetchBoard());
        });

      this.dragConfig();
    }
  }

  public dragConfig() {
    // todo:  better way to sync
    this.boardFacade.selectFocusNodes$
      .pipe(takeUntilDestroyed())
      .subscribe((nodes) => {
        this.drawingStore.selectNode$.next(nodes);
      });

    this.boardFacade
      .getNodes()
      .pipe(
        takeUntilDestroyed(),
        map((nodes) => {
          return nodes.filter(
            (node) => node.type === 'note' || node.type === 'panel',
          ) as TuNode<{ drawing: Drawing[] }>[];
        }),
      )
      .subscribe((nodes) => {
        this.drawingStore.nodes$.next(nodes);
      });

    toObservable(this.drawingStore.drawing)
      .pipe(takeUntilDestroyed())
      .subscribe((drawing) => {
        this.store.dispatch(
          PageActions.drawing({
            drawing,
          }),
        );
      });
  }

  public initBoard() {
    fromEvent<MouseEvent>(this.el.nativeElement, 'wheel', { passive: false })
      .pipe(
        filter((event: MouseEvent) => event.ctrlKey),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event: MouseEvent) => {
        event.preventDefault();
      });

    this.store
      .select(pageFeature.selectBoardCursor)
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
          this.store.select(selectZoom),
          this.store.select(selectPosition),
          this.store.select(selectUserId),
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
        this.store.dispatch(PageActions.setFocusId({ focusId: '' }));
      });

    this.boardMoveService.mouseMove$
      .pipe(
        withLatestFrom(
          this.store.select(selectZoom),
          this.store.select(selectPosition),
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
        withLatestFrom(this.store.select(selectZoom)),
      ),
    ).pipe(
      map(([move, zoom]) => {
        return {
          move,
          zoom,
        };
      }),
    );

    merge(
      this.boardMoveService.mouseDown$.pipe(map(() => true)),
      this.boardMoveService.mouseUp$.pipe(map(() => false)),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((press) => {
        if (press) {
          this.store.dispatch(
            PageActions.setBoardCursor({ cursor: 'grabbing' }),
          );
        } else {
          const cursor = this.boardShourtcutsDirective.panInProgresss()
            ? 'grab'
            : 'default';

          this.store.dispatch(PageActions.setBoardCursor({ cursor }));
        }
      });

    userView$
      .pipe(
        withLatestFrom(
          this.boardMoveService.mouseMove$,
          this.store.select(selectMoveEnabled),
        ),
        filter(([, , moveEnabled]) => moveEnabled),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([{ move, zoom }, mousePosition]) => {
        this.store.dispatch(
          PageActions.setUserView({
            zoom,
            position: {
              x: Math.round(move.x),
              y: Math.round(move.y),
            },
          }),
        );

        updateUserPosition(move, mousePosition, zoom);
      });

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

    combineLatest([
      this.store.select(selectZoom),
      this.store.select(selectPosition),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([zoom, position]) => {
        this.workLayerNativeElement.style.transform = `translate(${position.x}px, ${position.y}px) scale(${zoom})`;
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
    return this.workLayer.nativeElement as HTMLElement;
  }

  get isDemo() {
    return !!this.configService.config.DEMO;
  }

  public connect() {
    const boardId = this.route.snapshot.paramMap.get('id');

    if (boardId) {
      this.store.dispatch(PageActions.joinBoard({ boardId }));
      this.initBoard();
    }
  }

  public ngAfterViewInit() {
    this.connect();
  }

  public ngOnDestroy() {
    this.store.dispatch(PageActions.closeBoard());
  }
}
