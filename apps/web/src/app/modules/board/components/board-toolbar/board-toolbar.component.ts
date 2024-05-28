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
  selectZoom,
} from '../../selectors/page.selectors';
import { switchMap, take } from 'rxjs/operators';
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
import { Token } from '@tapiz/board-commons/models/token.model';
import {
  EstimationBoard,
  Group,
  Image,
  Panel,
  PollBoard,
  Text,
} from '@tapiz/board-commons';
import { DrawingStore } from '@tapiz/board-components/drawing/drawing.store';
import { TemplateSelectorComponent } from '../template-selector/template-selector.component';
import { NodesActions } from '@tapiz/nodes/services/nodes-actions';
import { HotkeysService } from '@tapiz/cdk/services/hostkeys.service';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ZoneService } from '../zone/zone.service';

@Component({
  selector: 'tapiz-board-toolbar',
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
  providers: [HotkeysService],
})
export class BoardToolbarComponent {
  #store = inject(Store);
  #notesService = inject(NotesService);
  #dialog = inject(MatDialog);
  #drawingStore = inject(DrawingStore);
  #nodesActions = inject(NodesActions);
  #hotkeysService = inject(HotkeysService);
  #zoneService = inject(ZoneService);

  canvasMode$ = this.#store.select(selectCanvasMode);
  imageForm = new FormGroup({
    url: new FormControl('', [Validators.required]),
  });
  toolbarSubscription?: Subscription;
  layer = this.#store.selectSignal(selectLayer);
  popup = this.#store.selectSignal(selectPopupOpen);

  constructor() {
    toObservable(this.popup)
      .pipe(
        takeUntilDestroyed(),
        switchMap((popup) => {
          if (popup) {
            return this.#hotkeysService.listen({ key: 'Escape' });
          }
          return [];
        }),
      )
      .subscribe(() => {
        this.popupOpen('');
      });
  }

  text() {
    this.popupOpen('text');

    this.toolbarSubscription = this.#zoneService
      .select('text')
      .subscribe(({ position }) => {
        this.popupOpen('');
        const action = this.#nodesActions.add<Text>('text', {
          text: '<p></p>',
          position,
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
      });
  }

  note() {
    if (this.popup() === 'note') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('note');

    this.toolbarSubscription = this.#zoneService
      .select()
      .subscribe(({ userId, position }) => {
        this.#notesService.createNote(userId, position);
        this.popupOpen('');
      });
  }

  select() {
    if (this.popup() === 'select') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('select');

    this.toolbarSubscription = this.#zoneService
      .selectArea('select')
      .subscribe((result) => {
        this.popupOpen('');

        if (!result) {
          return;
        }

        const selectedNodes = this.#zoneService.nodesInZone(result);
        this.#store.dispatch(PageActions.selectNodes({ ids: selectedNodes }));
      });
  }

  group() {
    if (this.popup() === 'group') {
      this.popupOpen('');

      return;
    }

    this.popupOpen('group');
    this.toolbarSubscription = this.#zoneService
      .selectArea('group')
      .subscribe((zone) => {
        this.popupOpen('');

        if (!zone) {
          return;
        }

        let { width, height } = zone.size;

        if (width < 2) {
          width = 300;
        }

        if (height < 2) {
          height = 300;
        }

        this.#store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions: [
              this.#nodesActions.add<Group>('group', {
                title: '',
                position: zone.position,
                width: width,
                height: height,
                votes: [],
                layer: zone.layer,
              }),
            ],
          }),
        );
      });
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

    this.toolbarSubscription = this.#zoneService
      .selectArea('panel')
      .subscribe((zone) => {
        this.popupOpen('');

        if (!zone) {
          return;
        }

        let { width, height } = zone.size;

        if (width < 2) {
          width = 300;
        }

        if (height < 2) {
          height = 300;
        }

        const panel: Panel = {
          text: '<h2 style="text-align: center"></h2>',
          position: zone.position,
          width: width,
          height: height,
          layer: zone.layer,
          rotation: 0,
          drawing: [],
        };

        this.#store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions: [this.#nodesActions.add('panel', panel)],
          }),
        );
      });
  }

  poll() {
    if (this.popup() === 'poll') {
      this.popupOpen('');
      return;
    }

    this.popupOpen('poll');

    this.toolbarSubscription = this.#zoneService
      .select()
      .subscribe(({ position }) => {
        this.popupOpen('');

        const poll: PollBoard = {
          title: '',
          layer: this.layer(),
          position,
          finished: false,
          options: [],
        };

        this.#store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions: [this.#nodesActions.add('poll', poll)],
          }),
        );
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

    this.toolbarSubscription = this.#zoneService
      .select()
      .subscribe(({ position }) => {
        this.popupOpen('');

        this.#store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions: [
              this.#nodesActions.add<EstimationBoard>('estimation', {
                layer: this.layer(),
                position,
              }),
            ],
          }),
        );
      });
  }

  tokenSelected(token: Pick<Token, 'backgroundColor' | 'color' | 'text'>) {
    this.toolbarSubscription = this.#zoneService
      .select()
      .subscribe(({ position }) => {
        this.popupOpen('');

        const tokenContent: Token = {
          ...token,
          layer: this.layer(),
          position,
          width: 100,
          height: 100,
        };

        this.#store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions: [this.#nodesActions.add<Token>('token', tokenContent)],
          }),
        );
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
