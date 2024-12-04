import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  WritableSignal,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { Editor } from '@tiptap/core';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { TextAlign } from '@tiptap/extension-text-align';
import { Link } from '@tiptap/extension-link';
import { FontFamily } from '@tiptap/extension-font-family';
import { History } from '@tiptap/extension-history';
import { EditorViewSharedStateService } from './editor-view-shared-state.service';
import { BubbleMenu } from './bubble-menu';
import { TuNode } from '@tapiz/board-commons';
import { Heading } from '@tiptap/extension-heading';
import { Paragraph } from '@tiptap/extension-paragraph';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { Strike } from '@tiptap/extension-strike';
import { Italic } from '@tiptap/extension-italic';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Text } from '@tiptap/extension-text';
import { ListItem } from '@tiptap/extension-list-item';
import { Mention, MentionNodeAttrs } from '@tiptap/extension-mention';
import { output } from '@angular/core';
import { input } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Subject, sampleTime } from 'rxjs';
import { FontSize } from './font-size-plugin';
import { PopupComponent } from '../popup/popup.component';
import { normalize } from '@tapiz/utils/normalize';

@Component({
  selector: 'tapiz-editor-view',
  template: `
    <div
      class="editor"
      #editor></div>

    @if (suggestionElement(); as suggestionElement) {
      <tapiz-popup [elRef]="suggestionElement">
        <div class="suggestions">
          @for (mention of suggestedMentions(); track mention) {
            <button
              [class.selected]="mentionIndex() === $index"
              (click)="selectMention($index)">
              {{ mention.name }}
            </button>
          } @empty {
            <p class="no-suggestions">No suggestions</p>
          }
        </div>
      </tapiz-popup>
    }

    <div
      class="link-menu"
      #linkMenu>
      <a
        target="_blank"
        [title]="linkUrl()"
        [href]="linkUrl()"
        >Open url: {{ linkUrl() }}</a
      >
      <div class="arrow"></div>
    </div>
  `,
  styleUrl: './editor-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PopupComponent],
  exportAs: 'editorView',
  host: {
    '[class.show]': 'focus()',
  },
})
export class EditorViewComponent implements OnDestroy, AfterViewInit {
  #editorViewSharedStateService = inject(EditorViewSharedStateService);
  content = input('');
  node = input.required<TuNode>();
  layoutToolbarOptions = input<boolean>(false);
  fontSize = input<boolean>(false);
  toolbar = input<boolean>(false);
  contentChange = output<string>();
  focus = input<boolean>(false);
  customClass = input('');
  popupComponent = viewChild(PopupComponent);
  mentions = input<{ id: string; name: string }[]>([]);
  suggestedMentions = signal<{ id: string; name: string }[]>([]);
  mentioned = output<string>();

  @ViewChild('text') text!: ElementRef<HTMLElement>;
  @ViewChild('editor') editor!: ElementRef<HTMLElement>;
  @ViewChild('linkMenu') linkMenu!: ElementRef<HTMLElement>;

  #editor: WritableSignal<Editor | null> = signal(null);
  suggestionElement = signal<null | Element>(null);

  mentionIndex = signal(0);
  mentionCommand: null | ((props: MentionNodeAttrs) => void) = null;

  #contentChange$ = new Subject<string>();

  linkUrl = signal('');

  constructor() {
    effect(() => {
      if (this.focus()) {
        this.#editor()?.view.focus();
      }
    });

    effect(() => {
      const instance = this.#editor();

      if (instance) {
        instance.commands.setContent(this.content());
      }
    });

    toObservable(this.toolbar)
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        if (value) {
          this.#showToolbar();
        } else {
          this.#hideToolbar();
        }
      });

    this.#contentChange$
      .pipe(takeUntilDestroyed(), sampleTime(300))
      .subscribe((html) => {
        this.contentChange.emit(html);
      });
  }

  ngAfterViewInit() {
    this.initEditor(this.content());
  }

  selectMention(index: number) {
    this.suggestionElement.set(null);
    this.mentionIndex.set(0);

    const item = this.suggestedMentions().at(index);

    if (item && this.mentionCommand) {
      this.mentionCommand({
        id: this.suggestedMentions()[index].id,
        label: this.suggestedMentions()[index].name,
      });
      this.mentioned.emit(this.suggestedMentions()[index].id);
    }
  }

  initEditor(content: string) {
    const node = document.createElement('div');
    node.innerHTML = content;

    node.querySelectorAll('br').forEach((br) => {
      if (!br.nextSibling && !br.previousSibling) {
        br.remove();
      }
    });

    this.#editor.set(
      new Editor({
        element: this.editor.nativeElement,
        editorProps: {
          attributes: {
            class: this.customClass(),
          },
        },
        extensions: [
          ListItem,
          Text,
          Document,
          OrderedList,
          Italic,
          Bold,
          Paragraph,
          BulletList,
          Strike,
          Heading.configure({
            levels: [1, 2, 3],
          }),
          TextStyle,
          Color,
          TextAlign.configure({
            types: ['heading', 'paragraph'],
          }),
          Link.configure({
            openOnClick: true,
          }),
          FontFamily.configure({
            types: ['textStyle'],
          }),
          FontSize,
          History.configure(),
          BubbleMenu.configure({
            element: this.linkMenu.nativeElement,
            shouldShow: ({ editor, nodeDom }) => {
              if (
                (nodeDom?.tagName !== 'A' && !nodeDom?.closest('a')) ||
                !this.toolbar()
              ) {
                return false;
              }

              const isLink = editor.isActive('link');

              if (isLink) {
                const currentUrl = editor.getAttributes('link')['href'] ?? '';
                this.linkUrl.set(currentUrl);

                if (!currentUrl) {
                  return false;
                }
              }

              return isLink;
            },
          }),
          Mention.configure({
            suggestion: {
              render: () => {
                return {
                  onStart: (props) => {
                    this.mentionCommand = props.command;
                    this.suggestionElement.set(props.decorationNode);
                    this.suggestedMentions.set(props.items);
                  },
                  onUpdate: (props) => {
                    this.mentionCommand = props.command;
                    this.suggestionElement.set(props.decorationNode);
                    this.suggestedMentions.set(props.items);
                  },
                  onKeyDown: (props) => {
                    if (props.event.key === 'Enter') {
                      this.selectMention(this.mentionIndex());
                      return true;
                    } else if (props.event.key === 'Escape') {
                      this.suggestionElement.set(null);

                      return true;
                    } else if (props.event.key === 'ArrowDown') {
                      this.mentionIndex.update((index) => {
                        return Math.min(
                          index + 1,
                          this.suggestedMentions().length - 1,
                        );
                      });

                      return true;
                    } else if (props.event.key === 'ArrowUp') {
                      this.mentionIndex.update((index) => {
                        return Math.max(index - 1, 0);
                      });

                      return true;
                    }

                    return false;
                  },
                  onExit: () => {
                    this.suggestionElement.set(null);
                  },
                };
              },
              items: ({ query }) => {
                return this.mentions().filter((item) => {
                  return normalize(item.name).includes(normalize(query));
                });
              },
            },
          }),
        ],
        content: node.innerHTML,
        onUpdate: ({ editor }) => {
          this.#contentChange$.next(editor.getHTML());
        },
        onCreate: ({ editor }) => {
          if (this.focus()) {
            editor.view.focus();
          }
        },
      }),
    );

    if (this.toolbar()) {
      this.#showToolbar();
    }
  }

  setTextSize(size: number) {
    this.#editor()?.view.dom.style.setProperty(
      '--text-editor-font-size',
      `${size}px`,
    );
  }

  ngOnDestroy(): void {
    this.#editor()?.destroy();

    const nodeId = this.node()?.id;

    if (nodeId) {
      this.#editorViewSharedStateService.removeNode(nodeId);
    }
  }

  #showToolbar() {
    const node = this.node();
    const instance = this.#editor();

    if (!node || !instance) {
      return;
    }

    this.#editorViewSharedStateService.addNode(this.node, instance, {
      layoutOptions: this.layoutToolbarOptions(),
      fontSize: this.fontSize(),
    });
  }

  #hideToolbar() {
    const nodeId = this.node()?.id;

    if (nodeId) {
      this.#editor()?.commands.blur();
      this.#editor()?.commands.setTextSelection(0);
      this.#editorViewSharedStateService.removeNode(nodeId);
    }
  }
}
