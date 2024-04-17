import {
  Component,
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import {
  selectCanvasMode,
  selectLayer,
  selectPopupOpen,
  selectPosition,
  selectUserId,
  selectZoom,
} from '../../selectors/page.selectors';
import { take, withLatestFrom } from 'rxjs/operators';
import { BoardMoveService } from '../../services/board-move.service';
import { NotesService } from '../../services/notes.service';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subscription, zip } from 'rxjs';
import 'emoji-picker-element';
import { EmojiClickEvent, NativeEmoji } from 'emoji-picker-element/shared';
import { MatDialog } from '@angular/material/dialog';
import { CocomaterialComponent } from '../cocomaterial/cocomaterial.component';
import { MatButtonModule } from '@angular/material/button';
import { AutoFocusDirective } from '../../directives/autofocus.directive';
import { MatInputModule } from '@angular/material/input';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TokenSelectorComponent } from '../token-selector/token-selector.component';
import { Token } from '@team-up/board-commons/models/token.model';
import {
  EstimationBoard,
  Image,
  PollBoard,
  Text,
} from '@team-up/board-commons';
import { DrawingStore } from '@team-up/board-components/drawing/drawing.store';
import { TemplateSelectorComponent } from '../template-selector/template-selector.component';
import { NodesActions } from '@team-up/nodes/services/nodes-actions';

@Component({
  selector: 'team-up-board-toolbar',
  templateUrl: './board-toolbar.component.html',
  styleUrls: ['./board-toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SvgIconComponent,
    ReactiveFormsModule,
    MatInputModule,
    AutoFocusDirective,
    MatButtonModule,
    AsyncPipe,
    MatIconModule,
    TokenSelectorComponent,
    TemplateSelectorComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BoardToolbarComponent {
  #store = inject(Store);
  #boardMoveService = inject(BoardMoveService);
  #notesService = inject(NotesService);
  #dialog = inject(MatDialog);
  #drawingStore = inject(DrawingStore);
  #nodesActions = inject(NodesActions);

  canvasMode$ = this.#store.select(selectCanvasMode);
  imageForm = new FormGroup({
    url: new FormControl('', [Validators.required]),
  });
  toolbarSubscription?: Subscription;
  layer = this.#store.selectSignal(selectLayer);
  popup = this.#store.selectSignal(selectPopupOpen);

  text() {
    this.popupOpen('text');

    this.#store.dispatch(PageActions.textToolbarClick());

    this.toolbarSubscription = this.#boardMoveService
      .nextMouseDown()
      .pipe(
        withLatestFrom(
          this.#store.select(selectZoom),
          this.#store.select(selectPosition),
        ),
      )
      .subscribe({
        next: ([event, zoom, position]) => {
          const textPosition = {
            x: (-position.x + event.pageX) / zoom,
            y: (-position.y + event.pageY) / zoom,
          };

          const action = this.#nodesActions.add<Text>('text', {
            text: '<p></p>',
            position: textPosition,
            layer: this.layer(),
            width: 200,
            height: 50,
            rotation: 0,
          });

          this.#store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [action],
            }),
          );
        },
        complete: () => this.popupOpen(''),
      });
  }

  note() {
    if (this.popup() === 'note') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('note');

    this.toolbarSubscription = this.#boardMoveService
      .nextMouseDown()
      .pipe(
        withLatestFrom(
          this.#store.select(selectZoom),
          this.#store.select(selectPosition),
          this.#store.select(selectUserId),
        ),
      )
      .subscribe({
        next: ([event, zoom, position, userId]) => {
          this.#notesService.createNote(userId, {
            x: (-position.x + event.clientX) / zoom,
            y: (-position.y + event.clientY) / zoom,
          });
        },
        complete: () => this.popupOpen(''),
      });
  }

  select() {
    if (this.popup() === 'select') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('select');

    this.#store.dispatch(
      PageActions.setInitZone({
        initZone: {
          type: 'select',
        },
      }),
    );
  }

  group() {
    if (this.popup() === 'group') {
      this.popupOpen('');
      this.#store.dispatch(
        PageActions.setInitZone({
          initZone: null,
        }),
      );
      return;
    }

    this.popupOpen('group');
    this.#store.dispatch(
      PageActions.setInitZone({
        initZone: {
          type: 'group',
        },
      }),
    );
  }

  vote() {
    if (this.popup() !== 'vote') {
      this.popupOpen('vote');
      this.#store.dispatch(PageActions.readyToVote());
    } else {
      this.popupOpen('');
    }
  }

  draw() {
    if (this.popup() !== 'draw') {
      this.popupOpen('draw');
      this.#drawingStore.actions.readyToDraw();
    } else {
      this.popupOpen('');
      this.#drawingStore.actions.finishDrawing();
    }
  }

  search() {
    if (this.popup() !== 'search') {
      this.popupOpen('search');
      this.#store.dispatch(PageActions.readyToSearch());
    } else {
      this.popupOpen('');
    }
  }

  cocomaterial() {
    if (this.popup() !== 'cocomaterial') {
      this.popupOpen('cocomaterial');

      const dialogRef = this.#dialog.open(CocomaterialComponent, {
        height: '900px',
        width: '800px',
        enterAnimationDuration: 0,
        exitAnimationDuration: 0,
        autoFocus: false,
      });

      dialogRef.afterClosed().subscribe(() => {
        this.popupOpen('');
      });
    } else {
      this.popupOpen('');
    }
  }

  panel() {
    if (this.popup() === 'panel') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('panel');
    this.#store.dispatch(
      PageActions.setInitZone({
        initZone: {
          type: 'panel',
        },
      }),
    );
  }

  poll() {
    if (this.popup() === 'poll') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('poll');

    this.toolbarSubscription = this.#boardMoveService
      .nextMouseDown()
      .pipe(
        withLatestFrom(
          this.#store.select(selectZoom),
          this.#store.select(selectPosition),
        ),
      )
      .subscribe({
        next: ([event, zoom, position]) => {
          const poll: PollBoard = {
            title: '',
            layer: this.layer(),
            position: {
              x: (-position.x + event.pageX) / zoom,
              y: (-position.y + event.pageY) / zoom,
            },
            finished: false,
            options: [],
          };

          this.#store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [this.#nodesActions.add('poll', poll)],
            }),
          );
        },
        complete: () => this.popupOpen(''),
      });
  }

  emoji() {
    if (this.popup() !== 'emoji') {
      this.popupOpen('emoji');
    } else {
      this.popupOpen('');
    }
  }

  emojiSelected(emojiEvent: EmojiClickEvent) {
    this.#store.dispatch(
      PageActions.selectEmoji({
        emoji: emojiEvent.detail.emoji as NativeEmoji,
      }),
    );
  }

  token() {
    if (this.popup() === 'token') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('token');
  }

  estimation() {
    if (this.popup() === 'estimation') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('estimation');

    this.toolbarSubscription = this.#boardMoveService
      .nextMouseDown()
      .pipe(
        withLatestFrom(
          this.#store.select(selectZoom),
          this.#store.select(selectPosition),
        ),
      )
      .subscribe({
        next: ([event, zoom, position]) => {
          this.#store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                this.#nodesActions.add<EstimationBoard>('estimation', {
                  layer: this.layer(),
                  position: {
                    x: (-position.x + event.pageX) / zoom,
                    y: (-position.y + event.pageY) / zoom,
                  },
                }),
              ],
            }),
          );
        },
        complete: () => this.popupOpen(''),
      });
  }

  tokenSelected(token: Pick<Token, 'backgroundColor' | 'color' | 'text'>) {
    this.toolbarSubscription = this.#boardMoveService
      .nextMouseDown()
      .pipe(
        withLatestFrom(
          this.#store.select(selectZoom),
          this.#store.select(selectPosition),
        ),
      )
      .subscribe({
        next: ([event, zoom, position]) => {
          const tokenContent: Token = {
            ...token,
            layer: this.layer(),
            position: {
              x: (-position.x + event.pageX) / zoom - 50,
              y: (-position.y + event.pageY) / zoom - 50,
            },
            width: 100,
            height: 100,
          };

          this.#store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [this.#nodesActions.add<Token>('token', tokenContent)],
            }),
          );
        },
        complete: () => this.popupOpen(''),
      });
  }

  popupOpen(popupName: string) {
    this.#store.dispatch(PageActions.setPopupOpen({ popup: popupName }));

    if (this.toolbarSubscription) {
      this.toolbarSubscription.unsubscribe();
      this.toolbarSubscription = undefined;
    }
  }

  newImage() {
    const url = this.imageForm.get('url')?.value;
    if (this.imageForm.valid && url) {
      zip(this.#store.select(selectZoom), this.#store.select(selectPosition))
        .pipe(take(1))
        .subscribe(([zoom, position]) => {
          this.#store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                this.#nodesActions.add<Image>('image', {
                  url,
                  layer: this.layer(),
                  position: {
                    x: -position.x / zoom,
                    y: -position.y / zoom,
                  },
                  rotation: 0,
                  width: 0,
                  height: 0,
                }),
              ],
            }),
          );
        });
    }

    this.imageForm.reset();
    this.popupOpen('');
  }

  templateSelector() {
    if (this.popup() === 'templates') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('templates');
  }

  seletedTemplate() {
    this.popupOpen('');
  }
}
