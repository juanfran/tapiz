import { BulletList, OrderedList, ListItem } from '@tiptap/extension-list';
import { UndoRedo } from '@tiptap/extensions';
import { TextStyleKit } from '@tiptap/extension-text-style';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  WritableSignal,
  effect,
  signal,
  viewChild,
} from '@angular/core';

import { Editor } from '@tiptap/core';
import { TextAlign } from '@tiptap/extension-text-align';
import { Link } from '@tiptap/extension-link';
import { BubbleMenu } from './bubble-menu';
import { Heading } from '@tiptap/extension-heading';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Strike } from '@tiptap/extension-strike';
import { Italic } from '@tiptap/extension-italic';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Text } from '@tiptap/extension-text';
import { Mention, MentionNodeAttrs } from '@tiptap/extension-mention';
import { output } from '@angular/core';
import { input } from '@angular/core';
import { PopupComponent } from '../popup/popup.component';
import { normalize } from '@tapiz/utils/normalize';
import { explicitEffect } from 'ngxtension/explicit-effect';

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
  content = input('');
  layoutToolbarOptions = input<boolean>(false);
  fontSize = input<boolean>(false);
  contentChange = output<string>();
  focus = input<boolean>(false);
  customClass = input('');
  defaultTextColor = input<string | null>(null);
  popupComponent = viewChild(PopupComponent);
  mentions = input<{ id: string; name: string }[]>([]);
  suggestedMentions = signal<{ id: string; name: string }[]>([]);
  mentioned = output<string>();
  editorBlur = output<void>();

  text = viewChild.required<ElementRef<HTMLElement>>('text');
  editorRef = viewChild.required<ElementRef<HTMLElement>>('editor');
  linkMenu = viewChild.required<ElementRef<HTMLElement>>('linkMenu');

  editor: WritableSignal<Editor | null> = signal(null);
  suggestionElement = signal<null | Element>(null);

  mentionIndex = signal(0);
  mentionCommand: null | ((props: MentionNodeAttrs) => void) = null;

  linkUrl = signal('');

  constructor() {
    explicitEffect([this.focus], ([focus]) => {
      if (focus) {
        this.editor()?.view.focus();
      }
    });

    effect(() => {
      const instance = this.editor();

      if (instance) {
        instance.commands.setContent(this.content());
      }
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

    const editor = new Editor({
      element: this.editorRef().nativeElement,
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
        TextStyleKit,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Link.configure({
          openOnClick: true,
        }),
        UndoRedo.configure(),
        BubbleMenu.configure({
          element: this.linkMenu().nativeElement,
          shouldShow: ({ editor, nodeDom }) => {
            if (nodeDom?.tagName !== 'A' && !nodeDom?.closest('a')) {
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
      onBlur: () => {
        this.editorBlur.emit();
      },
      onUpdate: ({ editor }) => {
        this.contentChange.emit(editor.getHTML());
      },
      onCreate: ({ editor }) => {
        if (this.focus()) {
          editor.view.focus();
        }

        const defaultTextColor = this.defaultTextColor();

        if (defaultTextColor) {
          editor.chain().setColor(defaultTextColor).run();
        }
      },
    });

    this.editor.set(editor);
  }

  setTextSize(size: number) {
    this.editor()?.view.dom.style.setProperty(
      '--text-editor-font-size',
      `${size}px`,
    );
  }

  ngOnDestroy(): void {
    this.editor()?.destroy();
  }
}
