import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
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
import { PageActions } from '../../actions/page.actions';
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
  standalone: true,
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
  styleUrl: './live-reaction.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveReactionComponent {
  #boardMoveService = inject(BoardMoveService);
  #store = inject(Store);
  #liveReactionStore = inject(LiveReactionStore);
  #http = inject(HttpClient);
  selected = signal<string>('');

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
    initialValue: [] as Emoji[],
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
      if (selected) {
        this.#store.dispatch(PageActions.setNodeSelection({ enabled: false }));
        this.#store.dispatch(
          PageActions.setBoardCursor({ cursor: 'crosshair' }),
        );
      } else {
        this.#store.dispatch(PageActions.setBoardCursor({ cursor: 'default' }));
        this.#store.dispatch(PageActions.setNodeSelection({ enabled: true }));
      }
    });

    this.#boardMoveService
      .relativeMouseDown()
      .pipe(
        takeUntilDestroyed(),
        filter(() => !!this.selected()),
      )
      .subscribe((data) => {
        this.#liveReactionStore.broadcast(this.selected(), {
          x: data.position.x - 50,
          y: data.position.y - 50,
        });
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
