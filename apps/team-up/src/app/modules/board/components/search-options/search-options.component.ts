import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { selectNotes, selectUsers } from '../../selectors/board.selectors';
import { map, startWith, withLatestFrom } from 'rxjs';
import { PageActions } from '../../actions/page.actions';
import { selectUserId, selectZoom } from '../../selectors/page.selectors';
import { BoardActions } from '../../actions/board.actions';
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
    search: new FormControl(''),
  });

  public store = inject(Store);
  public cd = inject(ChangeDetectorRef);
  public notes$ = this.store.select(selectNotes);
  public userse$ = this.store.select(selectUsers);
  public currentUser$ = this.store.select(selectUserId);

  public options$ = this.form.get('search')?.valueChanges.pipe(
    startWith(''),
    withLatestFrom(this.notes$, this.userse$, this.currentUser$),
    map(([value, notes, users, currentUserId]) => {
      const filteredNotes = notes.filter((note) => {
        const user = users.find((user) => user.id === note.ownerId);

        if (user) {
          if (user.id === currentUserId) {
            return true;
          }

          return user.visible;
        }

        return true;
      });

      if (value) {
        return filteredNotes.filter((note) =>
          this.normalizeText(note.text).includes(value)
        );
      }

      return filteredNotes;
    })
  );

  public selected(event: MatAutocompleteSelectedEvent) {
    this.form.get('search')?.setValue(null);

    document.body.clientWidth / 2;
    const x = -(event.option.value.position.x - document.body.clientWidth / 2);
    const y = -(event.option.value.position.y - document.body.clientHeight / 2);

    this.store.dispatch(
      PageActions.setUserView({
        zoom: 1,
        position: {
          x,
          y,
        },
      })
    );

    this.store.dispatch(
      BoardActions.moveCursor({
        cursor: {
          x,
          y,
        },
      })
    );

    this.store.dispatch(PageActions.setPopupOpen({ popup: '' }));
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
