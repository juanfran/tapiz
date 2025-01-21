import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  signal,
  inject,
  viewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { BoardActions } from '../../actions/board.actions';
import { BoardPageActions } from '../../actions/board-page.actions';
import { ClickOutside } from 'ngxtension/click-outside';
import { AutoFocusDirective } from '../../directives/autofocus.directive';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { HotkeysService } from '@tapiz/cdk/services/hostkeys.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ConfigService } from '../../../../services/config.service';
import { NgOptimizedImage } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'tapiz-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AutoFocusDirective,
    ClickOutside,
    MatIconModule,
    MatButtonModule,
    NgOptimizedImage,
  ],
  providers: [HotkeysService],
})
export class HeaderComponent {
  #store = inject(Store);
  #hotkeysService = inject(HotkeysService);
  #configService = inject(ConfigService);
  textarea = viewChild<ElementRef<HTMLInputElement>>('textarea');

  edit = signal(false);
  name = this.#store.selectSignal(boardPageFeature.selectName);
  isAdmin = this.#store.selectSignal(boardPageFeature.selectIsAdmin);
  boardId = this.#store.selectSignal(boardPageFeature.selectBoardId);
  teamName = this.#store.selectSignal(boardPageFeature.selectTeamName);
  teamId = this.#store.selectSignal(boardPageFeature.selectTeamId);

  get isDemo() {
    return !!this.#configService.config.DEMO;
  }

  constructor() {
    toObservable(this.edit)
      .pipe(
        takeUntilDestroyed(),
        switchMap((edit) => {
          if (edit) {
            return this.#hotkeysService.listen({ key: 'Escape' });
          }
          return [];
        }),
      )
      .subscribe(() => {
        this.edit.set(false);
      });
  }

  changeBoardMode(boardMode: number) {
    this.#store.dispatch(
      BoardPageActions.changeBoardMode({
        boardMode,
      }),
    );
  }

  editName() {
    this.edit.set(true);
  }

  enter(event: Event) {
    event.preventDefault();

    if (event.target) {
      this.edit.set(false);

      const name = (event.target as HTMLTextAreaElement).innerText;
      this.#store.dispatch(BoardActions.setBoardName({ name }));
    }
  }

  clickOutside() {
    this.edit.set(false);

    const el = this.textarea()?.nativeElement;

    if (!el) {
      return;
    }

    const name = el.innerText;

    if (name !== this.name()) {
      this.#store.dispatch(BoardActions.setBoardName({ name }));
    }
  }
}
