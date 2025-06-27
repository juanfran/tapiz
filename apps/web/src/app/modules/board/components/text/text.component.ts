import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  HostListener,
  signal,
  inject,
  Injector,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Text, TuNode } from '@tapiz/board-commons';
import { HotkeysService } from '@tapiz/cdk/services/hostkeys.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { HistoryService } from '../../services/history.service';
import { NodeSpaceComponent } from '../node-space';
import { EditorViewComponent } from '@tapiz/ui/editor-view';
import { SafeHtmlPipe } from '@tapiz/cdk/pipes/safe-html';
import { input } from '@angular/core';
import { EditorPortalComponent } from '../editor-portal/editor-portal.component';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { switchMap } from 'rxjs';
import { NodesStore } from '../../services/nodes.store';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { PortalComponent } from '@tapiz/ui/portal';
import { NodeToolbarComponent } from '../node-toolbar/node-toolbar.component';

@Component({
  selector: 'tapiz-text',

  template: `
    <tapiz-node-space
      [node]="node()"
      [resize]="true"
      [rotate]="true"
      [showOutline]="focus()"
      [enabled]="!edit()">
      @if (!edit()) {
        <div
          class="rich-text"
          [innerHTML]="node().content.text | safeHtml"></div>
      } @else {
        <tapiz-editor-portal [node]="node()">
          <tapiz-editor-view
            [class.readonly]="!edit()"
            #editorView="editorView"
            [content]="initialText()"
            [focus]="edit()"
            [fontSize]="true"
            [mentions]="mentions()"
            (mentioned)="onMention($event)"
            (contentChange)="setText($event)" />
        </tapiz-editor-portal>

        @if (editorView.editor(); as editor) {
          <tapiz-portal name="node-toolbar">
            <tapiz-node-toolbar
              [node]="node()"
              [editor]="editor" />
          </tapiz-portal>
        }
      }
    </tapiz-node-space>
  `,
  styleUrls: ['./text.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HotkeysService],
  imports: [
    NodeSpaceComponent,
    EditorViewComponent,
    SafeHtmlPipe,
    EditorPortalComponent,
    PortalComponent,
    NodeToolbarComponent,
  ],

  host: {
    '[class.focus]': 'focus()',
    '[class.toolbar]': 'edit()',
  },
})
export class TextComponent implements OnInit {
  #injector = inject(Injector);
  #historyService = inject(HistoryService);
  #store = inject(Store);
  #hotkeysService = inject(HotkeysService);
  #nodesStore = inject(NodesStore);

  node = input.required<TuNode<Text>>();
  pasted = input.required<boolean>();
  focus = input.required<boolean>();

  edit = signal(false);
  editText = signal('');
  initialText = signal('');
  mentions = this.#store.selectSignal(boardPageFeature.selectMentions);

  @HostListener('dblclick', ['$event'])
  mousedown(event: MouseEvent) {
    if (!this.edit()) {
      event.preventDefault();
      event.stopPropagation();

      this.initEdit();
    }
  }

  constructor() {
    explicitEffect([this.focus], ([focus]) => {
      if (!focus) {
        this.cancelEdit();
      }
    });

    explicitEffect([this.edit], ([edit]) => {
      if (edit) {
        this.#historyService.initEdit(this.node());
      } else {
        this.#historyService.finishEdit(this.node());
      }
    });

    toObservable(this.focus)
      .pipe(
        takeUntilDestroyed(),
        switchMap((focus) => {
          if (focus) {
            return this.#hotkeysService.listen({ key: 'Escape' });
          }
          return [];
        }),
      )
      .subscribe(() => {
        this.edit.set(false);
      });
  }

  initEdit() {
    this.initialText.set(this.node().content.text);
    this.edit.set(true);
    this.editText.set(this.node().content.text);
  }

  ngOnInit() {
    toObservable(this.node, {
      injector: this.#injector,
    }).subscribe((node) => {
      this.editText.set(node.content.text);
    });

    if (this.focus() && !this.pasted()) {
      this.initEdit();
    }
  }

  cancelEdit() {
    if (this.edit()) {
      this.#historyService.finishEdit(this.node());
      this.edit.set(false);
    }
  }

  setText(value: string) {
    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: false,
        actions: [
          {
            data: {
              type: 'text',
              id: this.node().id,
              content: {
                text: value,
              },
            },
            op: 'patch',
          },
        ],
      }),
    );
  }

  onMention(userId: string) {
    this.#nodesStore.mentionUser(userId, this.node().id);
  }
}
