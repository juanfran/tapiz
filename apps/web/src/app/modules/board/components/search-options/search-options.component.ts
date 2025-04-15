import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRender,
  computed,
  inject,
  signal,
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
import { BoardPageActions } from '../../actions/board-page.actions';
import {
  PanelNode,
  PollBoardNode,
  TextNode,
  isNote,
} from '@tapiz/board-commons';
import { BoardFacade } from '../../../../services/board-facade.service';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'tapiz-search-options',
  templateUrl: './search-options.component.html',
  styleUrls: ['./search-options.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  nodes = this.boardFacade.nodes;

  notes = computed(() => {
    return this.nodes().filter(isNote);
  });

  usersNodes = this.boardFacade.usersNodes;
  currentUser = this.store.selectSignal(boardPageFeature.selectUserId);

  visibleNotes = computed(() => {
    const notes = this.notes();
    const users = this.usersNodes();
    const currentUserId = this.currentUser();

    return notes
      .filter((note) => {
        const user = users.find((user) => user.id === note.content.ownerId);

        if (user) {
          if (user.id === currentUserId) {
            return true;
          }

          return user.content.visible;
        }

        return true;
      })
      .map((note) => {
        return {
          id: note.id,
          type: 'note',
          text: this.cleanHtml(note.content.text),
        };
      });
  });

  polls = computed(() => {
    return this.nodes()
      .filter((node): node is PollBoardNode => node.type === 'poll')
      .map((node) => {
        return {
          id: node.id,
          type: 'poll',
          text: node.content.title,
        };
      });
  });

  panels = computed(() => {
    return this.nodes()
      .filter((node): node is PanelNode => node.type === 'panel')
      .map((node) => {
        return {
          id: node.id,
          type: 'panel',
          text: this.cleanHtml(node.content.text),
        };
      });
  });

  text = computed(() => {
    return this.nodes()
      .filter((node): node is TextNode => node.type === 'text')
      .map((node) => {
        return {
          id: node.id,
          type: 'text',
          text: this.cleanHtml(node.content.text),
        };
      });
  });

  searchableNodes = computed(() => {
    return [
      ...this.visibleNotes(),
      ...this.polls(),
      ...this.panels(),
      ...this.text(),
    ];
  });

  get searchFormControl() {
    return this.form.controls.search;
  }

  options = signal<
    {
      id: string;
      type: string;
      text: string;
    }[]
  >(this.searchableNodes());

  constructor() {
    afterRender(() => {
      this.searchInput().nativeElement.focus();
    });

    this.searchFormControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        this.searchChange(value);
      });
  }

  cleanHtml(html: string) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }

  selected(event: MatAutocompleteSelectedEvent) {
    this.form.get('search')?.setValue('');

    this.store.dispatch(
      BoardPageActions.goToNode({ nodeId: event.option.value }),
    );
  }

  searchChange(value: string) {
    const nodes = this.searchableNodes();

    if (value) {
      this.options.set(
        nodes.filter((note) => this.normalizeText(note.text).includes(value)),
      );
    } else {
      this.options.set(nodes);
    }
  }

  normalizeText(text: string) {
    return text
      .normalize('NFD')
      .replace(/[Ð-ð]/g, 'd')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
