import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import {
  Observable,
  combineLatest,
  map,
  startWith,
  withLatestFrom,
} from 'rxjs';
import { PageActions } from '../../actions/page.actions';
import { selectUserId } from '../../selectors/page.selectors';
import { Note, TuNode, isNote } from '@team-up/board-commons';
import { BoardFacade } from '@/app/services/board-facade.service';
@Component({
  selector: 'team-up-search-options',
  templateUrl: './search-options.component.html',
  styleUrls: ['./search-options.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    CommonModule,
  ],
})
export class SearchOptionsComponent implements AfterViewInit {
  @ViewChild('search') searchInput!: ElementRef<HTMLInputElement>;

  public form = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  public store = inject(Store);
  public boardFacade = inject(BoardFacade);
  public notes$ = this.boardFacade
    .getNodes()
    .pipe(map((nodes) => nodes.filter(isNote)));
  public users$ = this.boardFacade.getUsers();
  public currentUser$ = this.store.select(selectUserId);
  public visibleNotes$ = combineLatest([this.notes$, this.users$]).pipe(
    withLatestFrom(this.currentUser$),
    map(([[notes, users], currentUserId]) => {
      const filteredNotes = notes.filter((note) => {
        const user = users.find((user) => user.id === note.content.ownerId);

        if (user) {
          if (user.id === currentUserId) {
            return true;
          }

          return user.content.visible;
        }

        return true;
      });

      return filteredNotes;
    })
  );

  public options$!: Observable<TuNode<Note>[]>;

  constructor() {
    const search = this.form.get('search');

    if (search) {
      this.options$ = combineLatest([
        search.valueChanges.pipe(startWith('')),
        this.visibleNotes$,
      ]).pipe(
        map(([value, notes]) => {
          if (value) {
            return notes.filter((note) =>
              this.normalizeText(note.content.text).includes(value)
            );
          }

          return notes;
        })
      );
    }
  }

  public selected(event: MatAutocompleteSelectedEvent) {
    this.form.get('search')?.setValue('');

    this.store.dispatch(PageActions.goToNote({ note: event.option.value }));
  }

  public normalizeText(text: string) {
    return text
      .normalize('NFD')
      .replace(/[Ð-ð]/g, 'd')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  public ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.searchInput.nativeElement.focus();
    });
  }
}
