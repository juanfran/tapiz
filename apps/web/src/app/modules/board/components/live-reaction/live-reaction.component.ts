import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { BoardMoveService } from '../../services/board-move.service';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs';
import { Store } from '@ngrx/store';
import { BoardPageActions } from '../../actions/board-page.actions';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { LiveReactionStore } from './live-reaction.store';
import {
  MatFormField,
  MatSelectChange,
  MatSelectModule,
} from '@angular/material/select';
import { HttpClient } from '@angular/common/http';
import { NgOptimizedImage } from '@angular/common';

interface Emoji {
  download_url: string;
  name: string;
}

@Component({
  selector: 'tapiz-live-reaction',
  imports: [MatSelectModule, MatFormField, NgOptimizedImage],
  template: `
    <mat-form-field>
      <mat-select
        [value]="category()"
        (selectionChange)="newCategory($event)">
        @for (category of categories; track category.value) {
          <mat-option [value]="category.name">{{ category.name }}</mat-option>
        }
      </mat-select>
    </mat-form-field>
    <div class="list">
      @for (emoji of emojis(); track emoji.download_url) {
        <button
          type="button"
          [class.selected]="selected() === emoji.download_url"
          (click)="selectEmoji(emoji.download_url)">
          <img
            [ngSrc]="emoji.download_url"
            width="100"
            height="100" />
        </button>
      }
    </div>
  `,
  styleUrls: ['./live-reaction.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveReactionComponent {
  #boardMoveService = inject(BoardMoveService);
  #store = inject(Store);
  #liveReactionStore = inject(LiveReactionStore);
  #http = inject(HttpClient);
  selected = signal<string>('');

  reactionSelected = output<string>();

  category = signal('Smilies');

  normalizedCategory = computed(() => {
    return this.category().replaceAll(' ', '%20').replaceAll('&', 'and');
  });

  emojis$ = toObservable(this.normalizedCategory).pipe(
    switchMap((category) => {
      return this.#fetchCategory(category);
    }),
    takeUntilDestroyed(),
  );

  emojis = toSignal(this.emojis$, {
    initialValue: [],
  });

  visibleEmojis = computed(() => {
    return this.emojis().slice(0, (this.page() + 1) * 30);
  });

  page = signal(0);

  categories = [
    {
      name: 'Smilies',
      value: 'smilies',
    },
    {
      name: 'Hand gestures',
      value: 'hand-gestures',
    },
    {
      name: 'People',
      value: 'people',
    },
    {
      name: 'People with activities',
      value: 'people-with-activities',
    },
    {
      name: 'People with professions',
      value: 'people-with-professions',
    },
    {
      name: 'Animals',
      value: 'animals',
    },
    {
      name: 'Food',
      value: 'food',
    },
    {
      name: 'Activities',
      value: 'activities',
    },
    {
      name: 'Travel & places',
      value: 'travel-and-places',
    },
    {
      name: 'Objects',
      value: 'objects',
    },
    {
      name: 'Symbols',
      value: 'symbols',
    },
  ];

  constructor() {
    explicitEffect([this.selected], ([selected]) => {
      this.#store.dispatch(
        BoardPageActions.addToBoardInProcess({ inProcess: !!selected }),
      );
    });

    this.#boardMoveService
      .relativeMouseDown()
      .pipe(
        takeUntilDestroyed(),
        filter((e) => !!this.selected() && e.button === 0),
      )
      .subscribe((data) => {
        if (data.panInProgress) {
          return;
        }

        this.#liveReactionStore.broadcast(this.selected(), {
          x: data.position.x,
          y: data.position.y,
        });

        this.reactionSelected.emit(this.selected());
      });
  }

  newCategory(event: MatSelectChange) {
    this.category.set(event.value);
  }

  selectEmoji(url: string) {
    this.selected.update((currentUrl) => {
      return currentUrl === url ? '' : url;
    });
  }

  #fetchCategory(category: string) {
    return this.#http.get<Emoji[]>(
      `https://api.github.com/repositories/516731265/contents/Emojis/${category}`,
    );
  }
}
