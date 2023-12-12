import { Component, ElementRef, ViewChild } from '@angular/core';
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
import { RxState } from '@rx-angular/state';
import { CocomaterialTag, CocomaterialApiVector } from '@team-up/board-commons';
import { Store } from '@ngrx/store';
import {
  selectCocomaterial,
  selectLayer,
  selectPosition,
  selectZoom,
} from '../../selectors/page.selectors';
import { map, startWith, take, withLatestFrom } from 'rxjs';
import { MatPaginatorModule } from '@angular/material/paginator';
import { PageActions } from '../../actions/page.actions';
import { SvgBackgroundDirective } from '../../directives/svg-background.directive';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { SafeHtmlPipe } from '@team-up/cdk/pipes/safe-html';
import { BoardActions } from '../../actions/board.actions';
import { MatDialogRef } from '@angular/material/dialog';
import { v4 } from 'uuid';

interface State {
  tags: CocomaterialTag[];
  allTags: CocomaterialTag[];
  filteredTags: CocomaterialTag[];
  vectors: CocomaterialApiVector[];
}

@Component({
  selector: 'team-up-cocomaterial',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatAutocompleteModule,
    MatPaginatorModule,
    SafeHtmlPipe,
    SvgBackgroundDirective,
    InfiniteScrollModule,
  ],
  templateUrl: './cocomaterial.component.html',
  styleUrls: ['./cocomaterial.component.scss'],
  providers: [RxState],
})
export class CocomaterialComponent {
  @ViewChild('tagInput') tagInput!: ElementRef<HTMLInputElement>;

  public readonly viewModel$ = this.state.select();
  public readonly layer = this.store.selectSignal(selectLayer);

  public separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor(
    private state: RxState<State>,
    private store: Store,
    public dialogRef: MatDialogRef<CocomaterialComponent>,
  ) {
    this.state.set({
      tags: [],
      filteredTags: [],
    });

    this.state.connect(
      'allTags',
      this.store.select(selectCocomaterial).pipe(map((cc) => cc.tags)),
    );

    this.state.connect(
      'vectors',
      this.store
        .select(selectCocomaterial)
        .pipe(map((cc) => cc.vectors?.results ?? [])),
    );

    const search = this.form.get('search');

    if (search) {
      this.state.connect(
        'filteredTags',
        search.valueChanges.pipe(
          startWith(null),
          map((tag: string | null) => {
            return tag ? this.filter(tag) : this.state.get('allTags');
          }),
        ),
      );
    }

    this.state.hold(
      this.state.select('tags').pipe(
        map((tags) => {
          return tags.map((tag) => tag.slug);
        }),
      ),
      (tags) => {
        this.store.dispatch(PageActions.fetchVectors({ tags }));
      },
    );
  }

  public form = new FormGroup({
    search: new FormControl(''),
  });

  public add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    const added = this.state.get('tags').find((it) => it.slug === value);

    if (added) {
      return;
    }

    this.state.set('tags', (state) => {
      const tag = state.allTags.find((tag) => tag.slug === value);

      if (tag) {
        return [...state.tags, tag];
      }

      return state.tags;
    });

    if (event.chipInput) {
      event.chipInput.clear();
    }
    this.form.get('search')?.setValue(null);
  }

  public remove(removeTag: CocomaterialTag): void {
    this.state.set('tags', (state) => {
      return state.tags.filter((tag) => {
        return tag.slug !== removeTag.slug;
      });
    });
  }

  public selected(event: MatAutocompleteSelectedEvent): void {
    this.state.set('tags', (state) => {
      const tag = state.allTags.find(
        (tag) => tag.slug === event.option.viewValue,
      );

      if (tag) {
        return [...state.tags, tag];
      }

      return state.tags;
    });

    this.tagInput.nativeElement.value = '';
    this.form.get('search')?.setValue(null);
  }

  public selectVector(vector: CocomaterialApiVector, event: MouseEvent) {
    this.store
      .select(selectPosition)
      .pipe(withLatestFrom(this.store.select(selectZoom)), take(1))
      .subscribe(([position, zoom]) => {
        if (vector.svg || vector.gif) {
          this.store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type: vector.svg ? 'vector' : 'image',
                    id: v4(),
                    content: {
                      url: vector.svg ?? vector.gif ?? '',
                      width: 150,
                      height: 150,
                      position: {
                        x: (-position.x + event.pageX) / zoom - 75,
                        y: (-position.y + event.pageY) / zoom - 75,
                      },
                      rotation: 0,
                      layer: this.layer(),
                    },
                  },
                  op: 'add',
                },
              ],
            }),
          );
        }
      });

    this.dialogRef.close();
  }

  public onScroll() {
    const tags = this.state.get('tags').map((tag) => tag.slug);

    this.store.dispatch(PageActions.nextVectorsPage({ tags }));
  }

  private filter(value: string): CocomaterialTag[] {
    const filterValue = value.toLowerCase();

    return this.state
      .get('allTags')
      .filter((tag) => tag.name.toLowerCase().includes(filterValue));
  }
}
