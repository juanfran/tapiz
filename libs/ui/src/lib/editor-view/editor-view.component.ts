import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnDestroy,
  Output,
  Signal,
  ViewChild,
  WritableSignal,
  effect,
  inject,
  signal,
} from '@angular/core';

import StarterKit from '@tiptap/starter-kit';
import { Editor } from '@tiptap/core';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Text from '@tiptap/extension-text';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import FontFamily from '@tiptap/extension-font-family';
import { ToolbarComponent } from '../toolbar';
import { EditorViewSharedStateService } from './editor-view-shared-state.service';
import { BubbleMenu } from './bubble-menu';
import { TuNode } from '@team-up/board-commons';

@Component({
  selector: 'team-up-editor-view',
  template: `
    <div
      class="editor"
      #editor></div>
    <div
      class="text"
      #text>
      {{ content }}
    </div>
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
  imports: [ToolbarComponent],
  exportAs: 'editorView',
})
export class EditorViewComponent implements OnDestroy, AfterViewInit {
  #editorViewSharedStateService = inject(EditorViewSharedStateService);

  #content = signal('');
  #toolbar = signal(false);
  #layoutToolbarOptions = signal(false);
  #node = signal<TuNode | null>(null);

  @Input({ required: true }) set node(node: TuNode) {
    this.#node.set(node);
  }

  @Input() set toolbar(value: boolean) {
    this.#toolbar.set(value);

    if (value) {
      this.#showToolbar();
    } else {
      this.#hideToolbar();
    }
  }

  @Input() set content(value: string) {
    this.#content.set(value);
  }

  @Input() set layoutToolbarOptions(value: boolean) {
    this.#layoutToolbarOptions.set(value);
  }

  @Output()
  contentChange = new EventEmitter<string>();

  @HostBinding('class.show')
  @Input()
  set focus(value: boolean) {
    this.#focus.set(value);
  }

  @ViewChild('text') text!: ElementRef<HTMLElement>;
  @ViewChild('editor') editor!: ElementRef<HTMLElement>;
  @ViewChild('linkMenu') linkMenu!: ElementRef<HTMLElement>;

  #focus = signal(false);
  #editor: WritableSignal<Editor | null> = signal(null);

  linkUrl = signal('');

  constructor() {
    effect(() => {
      if (this.#focus()) {
        this.#editor()?.view.focus();
      }
    });

    effect(() => {
      const instance = this.#editor();

      if (instance) {
        instance.commands.setContent(this.#content());
      }
    });
  }

  ngAfterViewInit() {
    this.initEditor(this.#content());
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
          StarterKit.configure({
            heading: {
              levels: [1, 2, 3],
            },
          }),
          Text,
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
          BubbleMenu.configure({
            element: this.linkMenu.nativeElement,
            shouldShow: ({ editor, nodeDom }) => {
              if (
                (nodeDom?.tagName !== 'A' && !nodeDom?.closest('a')) ||
                !this.#toolbar()
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
          this.contentChange.next(editor.getHTML());
        },
      }),
    );

    if (this.#focus()) {
      this.#editor()?.view.focus();
    }

    if (this.#toolbar()) {
      this.#showToolbar();
    }
  }

  ngOnDestroy(): void {
    this.#editor()?.destroy();

    const nodeId = this.#node()?.id;

    if (nodeId) {
      this.#editorViewSharedStateService.removeNode(nodeId);
    }
  }

  #showToolbar() {
    const node = this.#node();
    const instance = this.#editor();

    if (!node || !instance) {
      return;
    }

    this.#editorViewSharedStateService.addNode(
      this.#node.asReadonly() as Signal<TuNode>,
      instance,
      this.#layoutToolbarOptions(),
    );
  }

  #hideToolbar() {
    const nodeId = this.#node()?.id;

    if (nodeId) {
      this.#editor()?.commands.blur();
      this.#editor()?.commands.setTextSelection(0);
      this.#editorViewSharedStateService.removeNode(nodeId);
    }
  }
}
