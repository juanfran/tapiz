import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import {
  setInitZone,
  setPopupOpen,
  addNode,
  newImage,
  textToolbarClick,
  newText,
  readyToVote,
} from '../../actions/board.actions';
import {
  selectCanvasMode,
  selectPopupOpen,
  selectPosition,
  selectUserId,
  selectVisible,
  selectZoom,
} from '../../selectors/board.selectors';
import { withLatestFrom } from 'rxjs/operators';
import { BoardMoveService } from '../../services/board-move.service';
import { NotesService } from '../../services/notes.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { v4 } from 'uuid';
import { Subscription } from 'rxjs';
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

    this.store.dispatch(textToolbarClick());

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
            newText({
              text: {
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
            addNode({
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
        setInitZone({
          initZone: null,
        })
      );
      return;
    }

    this.popupOpen('group');
    this.store.dispatch(
      setInitZone({
        initZone: {
          type: 'group',
        },
      })
    );
  }

  public vote() {
    if (this.state.get('popupOpen') !== 'vote') {
      this.popupOpen('vote');
    } else {
      this.popupOpen('');
    }

    this.store.dispatch(readyToVote());
  }

  public panel() {
    this.popupOpen('panel');
    this.store.dispatch(
      setInitZone({
        initZone: {
          type: 'panel',
        },
      })
    );
  }

  public popupOpen(popupName: string) {
    this.store.dispatch(setPopupOpen({ popup: popupName }));

    if (this.toolbarSubscription) {
      this.toolbarSubscription.unsubscribe();
      this.toolbarSubscription = undefined;
    }
  }

  public newImage() {
    const url = this.imageForm.get('url')?.value;
    if (this.imageForm.valid && url) {
      this.store.dispatch(
        newImage({
          image: {
            id: v4(),
            url,
            position: { x: 0, y: 0 },
            width: 0,
            height: 0,
          },
        })
      );
    }

    this.imageForm.reset();
    this.popupOpen('');
  }
}
