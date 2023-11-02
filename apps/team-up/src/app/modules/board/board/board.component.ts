import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  HostListener,
  OnDestroy,
  HostBinding,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { animationFrameScheduler, fromEvent, merge, Subject, zip } from 'rxjs';
import {
  map,
  withLatestFrom,
  filter,
  first,
  take,
  throttleTime,
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
  selectDrawing,
  selectSearching,
  selectDragEnabled,
} from '../selectors/page.selectors';

import { BoardMoveService } from '../services/board-move.service';
import { BoardZoomService } from '../services/board-zoom.service';
import { ActivatedRoute } from '@angular/router';
import { NotesService } from '../services/notes.service';
import { WsService } from '@/app/modules/ws/services/ws.service';
import { v4 } from 'uuid';
import { PanelsComponent } from '../components/panels/panel.component';
import { VectorComponent } from '../components/vector/vector.component';
import { TextComponent } from '../components/text/text.component';
import { GroupComponent } from '../components/group/group.component';
import { ImageComponent } from '../components/image/image.component';
import { BoardDragDirective } from '../directives/board-drag.directive';
import { NoteComponent } from '../components/note/note.component';
import { CursorsComponent } from '../components/cursors/cursors.component';
import { ZoneComponent } from '../components/zone/zone.component';
import { OverlayComponent } from '../components/overlay/overlay.component';
import { CommonModule } from '@angular/common';
import { ToolbarComponent } from '../components/toolbar/toolbar.component';
import { UsersComponent } from '../components/users/users.component';
import { HeaderComponent } from '../components/header/header.component';
import { DrawingOptionsComponent } from '../components/drawing-options/drawing-options.component';
import { SearchOptionsComponent } from '../components/search-options/search-options.component';
import { Actions, ofType } from '@ngrx/effects';
import { CopyPasteDirective } from '../directives/copy-paste.directive';
import { TitleComponent } from '../../../shared/title/title.component';
import { ResizableDirective } from '../directives/resize.directive';
import { FollowUserComponent } from '@/app/shared/follow-user/follow-user.component';
import {
  Point,
  isGroup,
  isImage,
  isNote,
  isText,
  isVector,
} from '@team-up/board-commons';
import { pageFeature } from '../reducers/page.reducer';
import { MatDialogModule } from '@angular/material/dialog';
import { appFeature } from '@/app/+state/app.reducer';
import { RotateDirective } from '../directives/rotate.directive';
import { StopHighlightComponent } from '@/app/shared/stop-highlight/stop-highlight';
import { NodesComponent } from '../components/nodes/nodes.component';
import { BoardFacade } from '@/app/services/board-facade.service';
import { MultiDragService } from '@team-up/cdk/services/multi-drag.service';

@UntilDestroy()
@Component({
  selector: 'team-up-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [],
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    UsersComponent,
    ToolbarComponent,
    OverlayComponent,
    ZoneComponent,
    CursorsComponent,
    NoteComponent,
    BoardDragDirective,
    ResizableDirective,
    ImageComponent,
    GroupComponent,
    TextComponent,
    VectorComponent,
    PanelsComponent,
    DrawingOptionsComponent,
    SearchOptionsComponent,
    TitleComponent,
    FollowUserComponent,
    MatDialogModule,
    RotateDirective,
    StopHighlightComponent,
    MatProgressBarModule,
    NodesComponent,
  ],
  hostDirectives: [CopyPasteDirective],
})
export class BoardComponent implements AfterViewInit, OnDestroy {
  public readonly boardId$ = this.store.select(selectBoardId);
  public readonly nodes$ = this.boardFacade.getNodes();

  public readonly notes$ = this.nodes$.pipe(
    map((nodes) => nodes.filter(isNote)),
  );
  public readonly images$ = this.nodes$.pipe(
    map((nodes) => nodes.filter(isImage)),
  );
  public readonly vectors$ = this.nodes$.pipe(
    map((nodes) => nodes.filter(isVector)),
  );
  public readonly texts$ = this.nodes$.pipe(
    map((nodes) => nodes.filter(isText)),
  );
  public readonly groups$ = this.nodes$.pipe(
    map((nodes) => nodes.filter(isGroup)),
  );
  public readonly canvasMode$ = this.store.select(selectCanvasMode);
  public readonly newNote$ = new Subject<MouseEvent>();
  public readonly drawing = this.store.selectSignal(selectDrawing);
  public readonly search = this.store.selectSignal(selectSearching);
  public readonly boardTitle = this.store.selectSignal(pageFeature.selectName);
  public readonly folloUser = this.store.selectSignal(pageFeature.selectFollow);
  public readonly loaded = this.store.selectSignal(pageFeature.selectLoaded);
  public readonly userId = this.store.selectSignal(selectUserId);

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

  constructor(
    private wsService: WsService,
    private store: Store,
    private boardZoomService: BoardZoomService,
    private boardMoveService: BoardMoveService,
    private el: ElementRef,
    private route: ActivatedRoute,
    private notesService: NotesService,
    private actions: Actions,
    private boardFacade: BoardFacade,
    private multiDragService: MultiDragService,
  ) {
    this.multiDragService.setUp({
      dragEnabled: this.store.select(selectDragEnabled),
      zoom: this.store.select(selectZoom),
      relativePosition: this.store.select(selectPosition),
      move: (draggable, position) => {
        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: false,
            actions: [
              {
                data: {
                  type: draggable.nodeType,
                  id: draggable.id,
                  content: {
                    position,
                  },
                },
                op: 'patch',
              },
            ],
          }),
        );
      },
      end: (dragElements) => {
        const actions = dragElements.map((action) => {
          return {
            nodeType: action.nodeType,
            id: action.id,
            initialPosition: action.initialPosition,
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

    fromEvent(document, 'contextmenu')
      .pipe(untilDestroyed(this))
      .subscribe((event) => {
        event.preventDefault();
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
          this.el.nativeElement.classList.add(`cursor-text`);
        } else {
          this.el.nativeElement.classList.remove(`cursor-text`);
        }
      });

    this.newNote$
      .pipe(
        untilDestroyed(this),
        withLatestFrom(
          this.store.select(selectZoom),
          this.store.select(selectPosition),
          this.store.select(selectUserId),
          this.store.select(selectCanvasMode),
        ),
      )
      .subscribe(([event, zoom, position, userId, canvasMode]) => {
        if (canvasMode === 'editMode') {
          const note = this.notesService.getNew({
            ownerId: userId,
            position: {
              x: (-position.x + event.pageX) / zoom,
              y: (-position.y + event.pageY) / zoom,
            },
          });

          this.store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type: 'note',
                    id: v4(),
                    content: note,
                  },
                  op: 'add',
                },
              ],
            }),
          );
        }
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
                    {
                      data: {
                        type: 'image',
                        id: v4(),
                        content: {
                          url: reader.result as string,
                          width: 0,
                          height: 0,
                          position: {
                            x: (-position.x + event.clientX) / zoom,
                            y: (-position.y + event.clientY) / zoom,
                          },
                          rotation: 0,
                        },
                      },
                      op: 'add',
                    },
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
