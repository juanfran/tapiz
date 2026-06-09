import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  forwardRef,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Editor } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Italic } from '@tiptap/extension-italic';
import { Link } from '@tiptap/extension-link';
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Strike } from '@tiptap/extension-strike';
import { Text } from '@tiptap/extension-text';

@Component({
  selector: 'tapiz-rich-text-editor',
  imports: [MatIconModule],
  template: `
    <div
      class="toolbar"
      role="toolbar"
      aria-label="Text formatting">
      <button
        type="button"
        title="Bold"
        aria-label="Bold"
        [disabled]="disabled()"
        [class.active]="boldActive()"
        (click)="toggleBold()">
        <mat-icon>format_bold</mat-icon>
      </button>
      <button
        type="button"
        title="Italic"
        aria-label="Italic"
        [disabled]="disabled()"
        [class.active]="italicActive()"
        (click)="toggleItalic()">
        <mat-icon>format_italic</mat-icon>
      </button>
      <button
        type="button"
        title="Strike"
        aria-label="Strike"
        [disabled]="disabled()"
        [class.active]="strikeActive()"
        (click)="toggleStrike()">
        <mat-icon>strikethrough_s</mat-icon>
      </button>
      <span class="separator"></span>
      <button
        type="button"
        title="Link"
        aria-label="Link"
        [disabled]="disabled()"
        [class.active]="linkActive()"
        (click)="commandLink()">
        <mat-icon>link</mat-icon>
      </button>
      <span class="separator"></span>
      <button
        type="button"
        title="Bullet list"
        aria-label="Bullet list"
        [disabled]="disabled()"
        [class.active]="bulletListActive()"
        (click)="toggleBulletList()">
        <mat-icon>format_list_bulleted</mat-icon>
      </button>
      <button
        type="button"
        title="Ordered list"
        aria-label="Ordered list"
        [disabled]="disabled()"
        [class.active]="orderedListActive()"
        (click)="toggleOrderedList()">
        <mat-icon>format_list_numbered</mat-icon>
      </button>
    </div>

    <div
      class="editor"
      [class.disabled]="disabled()"
      (focusout)="markAsTouched()">
      <div #editor></div>
    </div>
  `,
  styleUrl: './rich-text-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
})
export class RichTextEditorComponent
  implements AfterViewInit, ControlValueAccessor, OnDestroy
{
  private editorRef = viewChild.required<ElementRef<HTMLElement>>('editor');
  private pendingValue = '';
  private writingValue = false;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected editor = signal<Editor | null>(null);
  protected disabled = signal(false);
  protected editorState = signal(0);

  protected boldActive = computed(() => {
    this.editorState();
    return this.editor()?.isActive('bold') ?? false;
  });

  protected italicActive = computed(() => {
    this.editorState();
    return this.editor()?.isActive('italic') ?? false;
  });

  protected strikeActive = computed(() => {
    this.editorState();
    return this.editor()?.isActive('strike') ?? false;
  });

  protected bulletListActive = computed(() => {
    this.editorState();
    return this.editor()?.isActive('bulletList') ?? false;
  });

  protected orderedListActive = computed(() => {
    this.editorState();
    return this.editor()?.isActive('orderedList') ?? false;
  });

  protected linkActive = computed(() => {
    this.editorState();
    return this.editor()?.isActive('link') ?? false;
  });

  ngAfterViewInit() {
    const editor = new Editor({
      element: this.editorRef().nativeElement,
      editable: !this.disabled(),
      editorProps: {
        attributes: {
          class: 'tapiz-rich-text-editor-content',
        },
      },
      extensions: [
        Document,
        Paragraph,
        Text,
        Bold,
        Italic,
        Strike,
        ListItem,
        BulletList,
        OrderedList,
        Link.configure({
          defaultProtocol: 'https',
          openOnClick: true,
        }),
      ],
      content: this.pendingValue,
      onBlur: () => {
        this.markAsTouched();
      },
      onSelectionUpdate: () => {
        this.bumpEditorState();
      },
      onUpdate: ({ editor }) => {
        this.bumpEditorState();

        if (this.writingValue) {
          return;
        }

        this.onChange(editor.isEmpty ? '' : editor.getHTML());
      },
    });

    this.editor.set(editor);
  }

  writeValue(value: string | null): void {
    const nextValue = value ?? '';

    this.pendingValue = nextValue;

    const editor = this.editor();

    if (!editor || editor.getHTML() === nextValue) {
      return;
    }

    this.writingValue = true;
    editor.commands.setContent(nextValue);
    this.writingValue = false;
    this.bumpEditorState();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    this.editor()?.setEditable(!isDisabled);
  }

  protected toggleBold() {
    this.editor()?.chain().focus().toggleBold().run();
    this.bumpEditorState();
  }

  protected toggleItalic() {
    this.editor()?.chain().focus().toggleItalic().run();
    this.bumpEditorState();
  }

  protected toggleStrike() {
    this.editor()?.chain().focus().toggleStrike().run();
    this.bumpEditorState();
  }

  protected toggleBulletList() {
    this.editor()?.chain().focus().toggleBulletList().run();
    this.bumpEditorState();
  }

  protected toggleOrderedList() {
    this.editor()?.chain().focus().toggleOrderedList().run();
    this.bumpEditorState();
  }

  protected commandLink() {
    const editor = this.editor();

    if (!editor) {
      return;
    }

    const previousUrl = editor.getAttributes('link')['href'] ?? '';
    const url = prompt('Link url', previousUrl);

    if (url === null) {
      return;
    }

    const href = this.normalizeLinkUrl(url);

    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      this.bumpEditorState();

      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    this.bumpEditorState();
  }

  protected markAsTouched() {
    this.onTouched();
  }

  private normalizeLinkUrl(url: string) {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      return '';
    }

    if (/^(https?:\/\/|mailto:|tel:|#|\/)/i.test(trimmedUrl)) {
      return trimmedUrl;
    }

    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmedUrl)) {
      return '';
    }

    return `https://${trimmedUrl}`;
  }

  private bumpEditorState() {
    this.editorState.update((value) => value + 1);
  }

  ngOnDestroy(): void {
    this.editor()?.destroy();
  }
}
