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
} from '@angular/core';
import { Store } from '@ngrx/store';
import { rxEffect } from 'ngxtension/rx-effect';
import { animationFrameScheduler, fromEvent, merge, Subject, zip } from 'rxjs';
import {
  map,
  withLatestFrom,
  filter,
  first,
  take,
  throttleTime,
  pairwise,
} from 'rxjs/operators';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BoardActions } from '../actions/board.actions';
import { PageActions } from '../actions/page.actions';

import {
  selectBoardCursor,
  selectCanvasMode,
  selectMoveEnabled,
  selectOpen,
  selectPosition,
  selectBoardId,
  selectUserId,
  selectZoom,
  selectSearching,
  selectDragEnabled,
  selectLayer,
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
import { Actions, ofType } from '@ngrx/effects';
import { CopyPasteDirective } from '../directives/copy-paste.directive';
import { TitleComponent } from '../../../shared/title/title.component';
import {
  Drawing,
  Image,
  Point,
  StateActions,
  TuNode,
} from '@team-up/board-commons';
import { pageFeature } from '../reducers/page.reducer';
import { MatDialogModule } from '@angular/material/dialog';
import { NodesComponent } from '../components/nodes/nodes.component';
import { MultiDragService } from '@team-up/cdk/services/multi-drag.service';
import { ContextMenuComponent } from '@team-up/ui/context-menu/context-menu.component';
import { ContextMenuStore } from '@team-up/ui/context-menu/context-menu.store';
import { BoardContextMenuComponent } from '../components/board-context-menu/board-contextmenu.component';
import { HistoryService } from '@team-up/nodes/services/history.service';
import { MoveService } from '@team-up/cdk/services/move.service';
import { ResizeService } from '@team-up/ui/resize/resize.service';
import { RotateService } from '@team-up/ui/rotate/rotate.service';
import { NodeToolbarComponent } from '../components/node-toolbar/node-toolbar.component';
import { WsService } from '../../ws/services/ws.service';
import { FollowUserComponent } from '../../../shared/follow-user/follow-user.component';
import { StopHighlightComponent } from '../../../shared/stop-highlight/stop-highlight';
import { BoardFacade } from '../../../services/board-facade.service';
import { appFeature } from '../../../+state/app.reducer';
import { SubscriptionService } from '../../../services/subscription.service';
import { DrawingStore } from '@team-up/board-components/drawing/drawing.store';
import { DrawingOptionsComponent } from '@team-up/board-components/drawing-options';
import { toObservable } from '@angular/core/rxjs-interop';
import { CommentsComponent } from '@team-up/nodes/comments/comments.component';
import { NodesActions } from '@team-up/nodes/services/nodes-actions';

@UntilDestroy()
@Component({
  selector: 'team-up-board',
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
  ],
  hostDirectives: [CopyPasteDirective],
})
export class BoardComponent implements AfterViewInit, OnDestroy {
  public el = inject(ElementRef);
  private wsService = inject(WsService);
  private store = inject(Store);
  private boardZoomService = inject(BoardZoomService);
  private boardMoveService = inject(BoardMoveService);
  private route = inject(ActivatedRoute);
  private notesService = inject(NotesService);
  private actions = inject(Actions);
  private boardFacade = inject(BoardFacade);
  private multiDragService = inject(MultiDragService);
  private contextMenuStore = inject(ContextMenuStore);
  private moveService = inject(MoveService);
  private resizeService = inject(ResizeService);
  private rotateService = inject(RotateService);
  private subscriptionService = inject(SubscriptionService);
  private drawingStore = inject(DrawingStore);
  private nodesActions = inject(NodesActions);
  public readonly boardId$ = this.store.select(selectBoardId);
  public readonly nodes$ = this.boardFacade.getNodes();

  public readonly historyService = inject(HistoryService);
  public readonly canvasMode$ = this.store.select(selectCanvasMode);
  public readonly newNote$ = new Subject<MouseEvent>();
  public readonly drawing = this.drawingStore.drawing;
  public readonly search = this.store.selectSignal(selectSearching);
  public readonly boardTitle = this.store.selectSignal(pageFeature.selectName);
  public readonly folloUser = this.store.selectSignal(pageFeature.selectFollow);
  public readonly loaded = this.store.selectSignal(pageFeature.selectLoaded);
  public readonly userId = this.store.selectSignal(selectUserId);
  public readonly layer = this.store.selectSignal(selectLayer);

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

  @HostListener('document:keydown.control.z') public undoAction() {
    this.undo();
  }

  @HostListener('document:keydown.control.y') public redoAction() {
    this.redo();
  }

  public undo() {
    this.store.dispatch(PageActions.undo());
  }

  public redo() {
    this.store.dispatch(PageActions.redo());
  }

  constructor() {
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

    this.historyService.event$.pipe(untilDestroyed(this)).subscribe((event) => {
      this.store.dispatch(PageActions.nodeSnapshot(event));
    });

    this.rotateService.onStart$.pipe(untilDestroyed(this)).subscribe((node) => {
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
      .pipe(untilDestroyed(this))
      .subscribe((node) => {
        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: false,
            actions: [this.nodesActions.patch(node)],
          }),
        );
      });

    this.resizeService.onStart$.pipe(untilDestroyed(this)).subscribe((node) => {
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
      .pipe(untilDestroyed(this))
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
      .pipe(take(1))
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
        .pipe(untilDestroyed(this))
        .subscribe(() => {
          this.store.dispatch(PageActions.refetchBoard());
        });
    }

    this.dragConfig();
  }

  public dragConfig() {
    // todo:  better way to sync
    this.boardFacade.selectFocusNodes$
      .pipe(untilDestroyed(this))
      .subscribe((nodes) => {
        this.drawingStore.selectNode$.next(nodes);
      });

    this.boardFacade
      .getNodes()
      .pipe(
        untilDestroyed(this),
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
      .pipe(untilDestroyed(this))
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
        untilDestroyed(this),
      )
      .subscribe((event: MouseEvent) => {
        event.preventDefault();
      });

    this.store
      .select(selectBoardCursor)
      .pipe(untilDestroyed(this))
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
        untilDestroyed(this),
        withLatestFrom(
          this.store.select(selectZoom),
          this.store.select(selectPosition),
          this.store.select(selectUserId),
        ),
      )
      .subscribe(([event, zoom, position, userId]) => {
        this.notesService.createNote(userId, {
          x: (-position.x + event.clientX) / zoom,
          y: (-position.y + event.clientY) / zoom,
        });
      });

    this.boardMoveService.listen(this.el.nativeElement);

    this.boardMoveService.mouseDown$
      .pipe(untilDestroyed(this))
      .subscribe(() => {
        this.store.dispatch(PageActions.setFocusId({ focusId: '' }));
      });

    this.boardMoveService.mouseMove$
      .pipe(
        untilDestroyed(this),
        withLatestFrom(
          this.store.select(selectZoom),
          this.store.select(selectPosition),
        ),
        throttleTime(0, animationFrameScheduler),
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

    userView$
      .pipe(
        untilDestroyed(this),
        withLatestFrom(
          this.boardMoveService.mouseMove$,
          this.store.select(selectMoveEnabled),
        ),
        filter(([, , moveEnabled]) => moveEnabled),
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

    this.actions
      .pipe(ofType(PageActions.setUserView), untilDestroyed(this))
      .subscribe(({ zoom, position }) => {
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
      zip(this.store.select(selectZoom), this.store.select(selectPosition))
        .pipe(take(1))
        .subscribe(([zoom, position]) => {
          const files = Array.from(droppedFiles);

          const images = files.filter((file) => file.type.startsWith('image'));

          images.forEach((image) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              this.store.dispatch(
                BoardActions.batchNodeActions({
                  history: true,
                  actions: [
                    this.nodesActions.add<Image>('image', {
                      url: reader.result as string,
                      width: 0,
                      height: 0,
                      position: {
                        x: (-position.x + event.clientX) / zoom,
                        y: (-position.y + event.clientY) / zoom,
                      },
                      layer: this.layer(),
                      rotation: 0,
                    }),
                  ],
                }),
              );
            };

            reader.readAsDataURL(image);
          });
        });
    }
  }

  get workLayerNativeElement() {
    return this.workLayer.nativeElement as HTMLElement;
  }

  public connect(): Promise<void> {
    this.wsService.listen();

    return new Promise((resolve, reject) => {
      this.store
        .select(selectOpen)
        .pipe(
          filter((open) => open),
          first(),
        )
        .subscribe(() => {
          const boardId = this.route.snapshot.paramMap.get('id');

          if (boardId) {
            this.store.dispatch(PageActions.joinBoard({ boardId }));
            resolve();
          } else {
            reject();
          }
        });
    });
  }

  // issue: https://github.com/angular/angular/issues/42609
  public trackById(index: number, obj: unknown) {
    return (obj as { id: string }).id;
  }

  public ngAfterViewInit() {
    this.connect().then(
      () => {
        this.initBoard();
      },
      () => {
        console.error('connection failed');
      },
    );
  }

  public ngOnDestroy() {
    this.store.dispatch(PageActions.closeBoard());
    this.wsService.close();
  }
}
