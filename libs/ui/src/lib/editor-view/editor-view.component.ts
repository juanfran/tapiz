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
} from '@angular/core';

import { Editor } from '@tiptap/core';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { TextAlign } from '@tiptap/extension-text-align';
import { Link } from '@tiptap/extension-link';
import { FontFamily } from '@tiptap/extension-font-family';
import { History } from '@tiptap/extension-history';
import { ToolbarComponent } from '../toolbar';
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
import { output } from '@angular/core';
import { input } from '@angular/core';
import { SafeHtmlPipe } from '@tapiz/cdk/pipes/safe-html';

@Component({
  selector: 'tapiz-editor-view',
  template: `
    <div
      class="editor"
      #editor></div>
    <div style="isolation: isolete">
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
    </div>
  `,
  styleUrl: './editor-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ToolbarComponent, SafeHtmlPipe],
  exportAs: 'editorView',
  host: {
    '[class.show]': 'focus()',
  },
})
export class EditorViewComponent implements OnDestroy, AfterViewInit {
  #editorViewSharedStateService = inject(EditorViewSharedStateService);

  content = input('');
  node = input.required<TuNode>();
  toolbar = input.required<boolean>();
  layoutToolbarOptions = input<boolean>(false);

  contentChange = output<string>();

  focus = input<boolean>(false);

  @ViewChild('text') text!: ElementRef<HTMLElement>;
  @ViewChild('editor') editor!: ElementRef<HTMLElement>;
  @ViewChild('linkMenu') linkMenu!: ElementRef<HTMLElement>;

  #editor: WritableSignal<Editor | null> = signal(null);

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

    effect(() => {
      if (this.toolbar()) {
        this.#showToolbar();
      } else {
        this.#hideToolbar();
      }
    });
  }

  ngAfterViewInit() {
    this.initEditor(this.content());
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
        ],
        content: node.innerHTML,
        onUpdate: ({ editor }) => {
          this.contentChange.emit(editor.getHTML());
        },
      }),
    );

    if (this.focus()) {
      this.#editor()?.view.focus();
    }

    if (this.toolbar()) {
      this.#showToolbar();
    }
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

    this.#editorViewSharedStateService.addNode(
      this.node,
      instance,
      this.layoutToolbarOptions(),
    );
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
