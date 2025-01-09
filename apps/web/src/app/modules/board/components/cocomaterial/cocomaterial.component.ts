import {
  Component,
  ElementRef,
  Signal,
  viewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  CocomaterialTag,
  CocomaterialApiVector,
  Point,
} from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { selectCocomaterial } from '../../selectors/page.selectors';
import { filter, map, startWith } from 'rxjs';
import { MatPaginatorModule } from '@angular/material/paginator';
import { PageActions } from '../../actions/page.actions';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { BoardActions } from '../../actions/board.actions';
import { NodesActions } from '@tapiz/nodes/services/nodes-actions';
import { pageFeature } from '../../reducers/page.reducer';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { BoardMoveService } from '../../services/board-move.service';

@Component({
  selector: 'tapiz-cocomaterial',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatAutocompleteModule,
    MatPaginatorModule,
    InfiniteScrollDirective,
  ],
  templateUrl: './cocomaterial.component.html',
  styleUrls: ['./cocomaterial.component.scss'],
})
export class CocomaterialComponent {
  #store = inject(Store);
  #boardMoveService = inject(BoardMoveService);
  #nodesActions = inject(NodesActions);
  tagInput = viewChild.required<ElementRef<HTMLInputElement>>('tagInput');

  boardMode = this.#store.selectSignal(pageFeature.selectBoardMode);

  tags = signal<CocomaterialTag[]>([]);
  filteredTags!: Signal<CocomaterialTag[]>;

  cocomaterial = this.#store.selectSignal(selectCocomaterial);
  allTags = computed(() => this.cocomaterial().tags);
  vectors = computed(() => this.cocomaterial().vectors?.results ?? []);
  selected = signal<CocomaterialApiVector | null>(null);

  separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor() {
    const search = this.form.get('search');

    if (search) {
      const search$ = search.valueChanges.pipe(
        startWith(null),
        map((tag: string | null) => {
          return tag ? this.#filter(tag) : this.allTags();
        }),
      );

      this.filteredTags = toSignal(search$, {
        initialValue: [],
      });
    }

    explicitEffect([this.tags], ([tags]) => {
      const tagSlugs = tags.map((tag) => tag.slug);

      this.#store.dispatch(PageActions.fetchVectors({ tags: tagSlugs }));
    });

    explicitEffect([this.selected], ([selected]) => {
      this.#store.dispatch(
        PageActions.addToBoardInProcess({ inProcess: !!selected }),
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

        this.#addVectorToBoard(data);
      });
  }

  form = new FormGroup({
    search: new FormControl(''),
  });

  toggleSelect(vector: CocomaterialApiVector) {
    if (this.selected() === vector) {
      this.selected.set(null);
      return;
    }

    this.selected.set(vector);
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    const added = this.tags().find((it) => it.slug === value);

    if (added) {
      return;
    }

    const tag = this.allTags().find((tag) => tag.slug === value);

    if (tag) {
      this.tags.update((tags) => {
        return [...tags, tag];
      });
    }

    if (event.chipInput) {
      event.chipInput.clear();
    }
    this.form.get('search')?.setValue(null);
  }

  remove(removeTag: CocomaterialTag): void {
    this.tags.update((tags) => {
      return tags.filter((tag) => {
        return tag.slug !== removeTag.slug;
      });
    });
  }

  optionSelected(event: MatAutocompleteSelectedEvent): void {
    this.tags.update((tags) => {
      const tag = this.allTags().find(
        (tag) => tag.slug === event.option.viewValue,
      );

      if (tag) {
        return [...tags, tag];
      }

      return tags;
    });

    this.tagInput().nativeElement.value = '';
    this.form.get('search')?.setValue(null);
  }

  onScroll() {
    const tags = this.tags().map((tag) => tag.slug);

    this.#store.dispatch(PageActions.nextVectorsPage({ tags }));
  }

  #addVectorToBoard(data: { layer: number; position: Point }) {
    const vector = this.selected();

    if (vector && (vector.svg || vector.gif)) {
      this.#store.dispatch(
        BoardActions.batchNodeActions({
          history: true,
          actions: [
            this.#nodesActions.add(vector.svg ? 'vector' : 'image', {
              url: vector.svg ?? vector.gif ?? '',
              width: 150,
              height: 150,
              position: data.position,
              rotation: 0,
              layer: data.layer,
            }),
          ],
        }),
      );
    }
  }

  #filter(value: string): CocomaterialTag[] {
    const filterValue = value.toLowerCase();

    return this.allTags().filter((tag) =>
      tag.name.toLowerCase().includes(filterValue),
    );
  }
}
