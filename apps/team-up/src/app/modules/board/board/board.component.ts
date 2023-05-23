import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { merge, Subject, zip } from 'rxjs';
import {
  startWith,
  map,
  withLatestFrom,
  filter,
  first,
  take,
} from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BoardActions } from '../actions/board.actions';
import { PageActions } from '../actions/page.actions';

import {
  selectGroups,
  selectImages,
  selectNotes,
  selectTexts,
  selectVectors,
} from '../selectors/board.selectors';

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
} from '../selectors/page.selectors';

import { BoardMoveService } from '../services/board-move.service';
import { BoardZoomService } from '../services/board-zoom.service';
import { ActivatedRoute } from '@angular/router';
import { NotesService } from '../services/notes.service';
import { MatDialog } from '@angular/material/dialog';
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
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import { ToolbarComponent } from '../components/toolbar/toolbar.component';
import { UsersComponent } from '../components/users/users.component';
import { HeaderComponent } from '../components/header/header.component';
import { DrawingOptionsComponent } from '../components/drawing-options/drawing-options.component';

@UntilDestroy()
@Component({
  selector: 'team-up-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [
    HeaderComponent,
    UsersComponent,
    ToolbarComponent,
    NgIf,
    OverlayComponent,
    ZoneComponent,
    CursorsComponent,
    NgFor,
    NoteComponent,
    BoardDragDirective,
    ImageComponent,
    GroupComponent,
    TextComponent,
    VectorComponent,
    PanelsComponent,
    DrawingOptionsComponent,
    AsyncPipe,
  ],
})
export class BoardComponent implements AfterViewInit, OnDestroy {
  public readonly notes$ = this.store.select(selectNotes);
  public readonly boardId$ = this.store.select(selectBoardId);
  public readonly images$ = this.store.select(selectImages);
  public readonly vectors$ = this.store.select(selectVectors);
  public readonly texts$ = this.store.select(selectTexts);
  public readonly groups$ = this.store.select(selectGroups);
  public readonly canvasMode$ = this.store.select(selectCanvasMode);
  public readonly newNote$ = new Subject<MouseEvent>();
  public readonly drawing = this.store.selectSignal(selectDrawing);

  @ViewChild('workLayer', { read: ElementRef }) public workLayer!: ElementRef;

  @HostListener('dblclick', ['$event'])
  public dblclick(event: MouseEvent) {
    if (event.target !== this.el.nativeElement) {
      return;
    }

    this.newNote$.next(event);
  }

  @HostListener('document:keydown.control.z') public undoAction() {
    console.log('sdfsdf undo');
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
    public dialog: MatDialog
  ) {
    this.store.dispatch(PageActions.initBoard());
  }

  public initBoard() {
    this.store
      .select(selectBoardCursor)
      .pipe(untilDestroyed(this))
      .subscribe((cursor) => {
        this.el.nativeElement.style.cursor = cursor;

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
          this.store.select(selectCanvasMode)
        )
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
            BoardActions.addNode({
              node: note,
              nodeType: 'note',
            })
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
          this.store.select(selectPosition)
        )
      )
      .subscribe(([mousePosition, zoom, position]) => {
        this.store.dispatch(
          BoardActions.moveCursor({
            cursor: {
              x: (-position.x + mousePosition.x) / zoom,
              y: (-position.y + mousePosition.y) / zoom,
            },
          })
        );
      });

    const userView$ = merge(
      this.boardZoomService.zoomMove$,
      this.boardMoveService.boardMove$.pipe(
        withLatestFrom(this.store.select(selectZoom))
      )
    ).pipe(
      map(([move, zoom]) => {
        return {
          move,
          zoom,
        };
      })
    );

    userView$
      .pipe(
        startWith({
          move: { x: 0, y: 0 },
          zoom: 1,
        }),
        untilDestroyed(this),
        withLatestFrom(this.store.select(selectMoveEnabled)),
        filter(([, moveEnabled]) => moveEnabled)
      )
      .subscribe(([{ move, zoom }]) => {
        this.workLayerNativeElement.style.transform = `translate(${move.x}px, ${move.y}px) scale(${zoom})`;

        this.store.dispatch(PageActions.setUserView({ zoom, position: move }));
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
                BoardActions.addNode({
                  nodeType: 'image',
                  node: {
                    id: v4(),
                    url: reader.result as string,
                    width: 0,
                    height: 0,
                    position: {
                      x: (-position.x + event.clientX) / zoom,
                      y: (-position.y + event.clientY) / zoom,
                    },
                  },
                })
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
          first()
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
      }
    );
  }

  public ngOnDestroy() {
    this.store.dispatch(PageActions.closeBoard());
    this.wsService.close();
  }
}
