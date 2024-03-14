import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRender,
  inject,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import {
  MAT_AUTOCOMPLETE_SCROLL_STRATEGY_FACTORY_PROVIDER,
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { combineLatest, map, startWith, withLatestFrom } from 'rxjs';
import { PageActions } from '../../actions/page.actions';
import { selectUserId } from '../../selectors/page.selectors';
import {
  PanelNode,
  PollBoardNode,
  TextNode,
  isNote,
} from '@team-up/board-commons';
import { BoardFacade } from '../../../../services/board-facade.service';
import { toSignal } from '@angular/core/rxjs-interop';

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
  ],
  providers: [MAT_AUTOCOMPLETE_SCROLL_STRATEGY_FACTORY_PROVIDER],
})
export class SearchOptionsComponent {
  searchInput = viewChild.required<ElementRef<HTMLInputElement>>('search');

  form = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
  });

  store = inject(Store);
  boardFacade = inject(BoardFacade);
  nodes = this.boardFacade.getNodes();

  notes$ = this.nodes.pipe(map((nodes) => nodes.filter(isNote)));
  users$ = this.boardFacade.getUsers();
  currentUser$ = this.store.select(selectUserId);
  visibleNotes$ = combineLatest([this.notes$, this.users$]).pipe(
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

      return filteredNotes.map((note) => {
        return {
          id: note.id,
          type: 'note',
          text: note.content.text,
        };
      });
    }),
  );

  polls$ = this.nodes.pipe(
    map((nodes) => {
      return nodes
        .filter((node): node is PollBoardNode => node.type === 'poll')
        .map((node) => {
          return {
            id: node.id,
            type: 'poll',
            text: node.content.title,
          };
        });
    }),
  );

  panels$ = this.nodes.pipe(
    map((nodes) => {
      return nodes
        .filter((node): node is PanelNode => node.type === 'panel')
        .map((node) => {
          return {
            id: node.id,
            type: 'panel',
            text: this.cleanHtml(node.content.text),
          };
        });
    }),
  );

  text$ = this.nodes.pipe(
    map((nodes) => {
      return nodes
        .filter((node): node is TextNode => node.type === 'text')
        .map((node) => {
          return {
            id: node.id,
            type: 'text',
            text: this.cleanHtml(node.content.text),
          };
        });
    }),
  );

  searchableNodes$ = combineLatest([
    this.visibleNotes$,
    this.polls$,
    this.panels$,
    this.text$,
  ]).pipe(
    map(([notes, polls, panels, text]) => {
      return [...notes, ...polls, ...panels, ...text];
    }),
  );

  get searchFormControl() {
    return this.form.get('search') as FormControl;
  }

  #options$ = combineLatest([
    this.searchFormControl.valueChanges.pipe(startWith('')),
    this.searchableNodes$,
  ]).pipe(
    map(([value, nodes]) => {
      if (value) {
        return nodes.filter((note) =>
          this.normalizeText(note.text).includes(value),
        );
      }

      return nodes;
    }),
  );
  options = toSignal(this.#options$);

  constructor() {
    afterRender(() => {
      this.searchInput().nativeElement.focus();
    });
  }

  cleanHtml(html: string) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }

  selected(event: MatAutocompleteSelectedEvent) {
    this.form.get('search')?.setValue('');

    this.store.dispatch(PageActions.goToNode({ nodeId: event.option.value }));
  }

  normalizeText(text: string) {
    return text
      .normalize('NFD')
      .replace(/[Ð-ð]/g, 'd')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
