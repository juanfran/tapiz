import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import {
  selectCanvasMode,
  selectEmoji,
  selectPopupOpen,
  selectPosition,
  selectUserId,
  selectVisible,
  selectZoom,
} from '../../selectors/page.selectors';
import { take, withLatestFrom } from 'rxjs/operators';
import { BoardMoveService } from '../../services/board-move.service';
import { NotesService } from '../../services/notes.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { v4 } from 'uuid';
import { Subscription, zip } from 'rxjs';
import 'emoji-picker-element';
import { EmojiClickEvent, NativeEmoji } from 'emoji-picker-element/shared';

interface State {
  visible: boolean;
  popupOpen: string;
}

@Component({
  selector: 'team-up-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class ToolbarComponent {
  public readonly model$ = this.state.select();
  public canvasMode$ = this.store.select(selectCanvasMode);
  public imageForm = new FormGroup({
    url: new FormControl('', [Validators.required]),
  });
  public toolbarSubscription?: Subscription;

  constructor(
    public state: RxState<State>,
    private store: Store,
    private boardMoveService: BoardMoveService,
    private notesService: NotesService
  ) {
    this.state.connect('visible', this.store.select(selectVisible));
    this.state.connect('popupOpen', this.store.select(selectPopupOpen));
  }

  public text() {
    this.popupOpen('text');

    this.store.dispatch(PageActions.textToolbarClick());

    this.toolbarSubscription = this.boardMoveService
      .nextMouseDown()
      .pipe(
        withLatestFrom(
          this.store.select(selectZoom),
          this.store.select(selectPosition)
        )
      )
      .subscribe({
        next: ([event, zoom, position]) => {
          const textPosition = {
            x: (-position.x + event.pageX) / zoom,
            y: (-position.y + event.pageY) / zoom,
          };

          this.store.dispatch(
            BoardActions.addNode({
              nodeType: 'text',
              node: {
                id: v4(),
                text: 'Text',
                position: textPosition,
                width: 200,
                height: 50,
                color: '#000',
                size: 16,
              },
            })
          );
        },
        complete: () => this.popupOpen(''),
      });
  }

  public note() {
    if (this.state.get('popupOpen') === 'note') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('note');

    this.toolbarSubscription = this.boardMoveService
      .nextMouseDown()
      .pipe(
        withLatestFrom(
          this.store.select(selectZoom),
          this.store.select(selectPosition),
          this.store.select(selectUserId)
        )
      )
      .subscribe({
        next: ([event, zoom, position, userId]) => {
          const note = this.notesService.getNew({
            ownerId: userId,
            position: {
              x: (-position.x + event.pageX) / zoom,
              y: (-position.y + event.pageY) / zoom,
            },
          });

          this.store.dispatch(
            BoardActions.addNode({
              nodeType: 'note',
              node: note,
            })
          );
        },
        complete: () => this.popupOpen(''),
      });
  }

  public group() {
    if (this.state.get('popupOpen') === 'group') {
      this.popupOpen('');
      this.store.dispatch(
        PageActions.setInitZone({
          initZone: null,
        })
      );
      return;
    }

    this.popupOpen('group');
    this.store.dispatch(
      PageActions.setInitZone({
        initZone: {
          type: 'group',
        },
      })
    );
  }

  public vote() {
    if (this.state.get('popupOpen') !== 'vote') {
      this.popupOpen('vote');
      this.store.dispatch(PageActions.readyToVote());
    } else {
      this.popupOpen('');
    }
  }

  public panel() {
    this.popupOpen('panel');
    this.store.dispatch(
      PageActions.setInitZone({
        initZone: {
          type: 'panel',
        },
      })
    );
  }

  public emoji() {
    if (this.state.get('popupOpen') !== 'emoji') {
      this.popupOpen('emoji');
    } else {
      this.popupOpen('');
    }
  }

  public emojiSelected(emojiEvent: EmojiClickEvent) {
    this.store.dispatch(
      PageActions.selectEmoji({ emoji: emojiEvent.detail.emoji as NativeEmoji })
    );
  }

  public popupOpen(popupName: string) {
    this.store.dispatch(PageActions.setPopupOpen({ popup: popupName }));

    if (this.toolbarSubscription) {
      this.toolbarSubscription.unsubscribe();
      this.toolbarSubscription = undefined;
    }
  }

  public newImage() {
    const url = this.imageForm.get('url')?.value;
    if (this.imageForm.valid && url) {
      zip(this.store.select(selectZoom), this.store.select(selectPosition))
        .pipe(take(1))
        .subscribe(([zoom, position]) => {
          this.store.dispatch(
            BoardActions.addNode({
              nodeType: 'image',
              node: {
                id: v4(),
                url,
                position: {
                  x: -position.x / zoom,
                  y: -position.y / zoom,
                },
                width: 0,
                height: 0,
              },
            })
          );
        });
    }

    this.imageForm.reset();
    this.popupOpen('');
  }
}
