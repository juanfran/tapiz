import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { Editor } from '@tiptap/core';
import { ToolbarEditorService } from '../../toolbar-editor.service';

@Component({
  selector: 'tapiz-toolbar-option-format',
  template: `
    <div class="buttons">
      <button
        title="Bold"
        [class.active]="editor().isActive('bold')"
        (click)="actionBold()">
        <mat-icon>format_bold</mat-icon>
      </button>
      <button
        title="Italic"
        [class.active]="editor().isActive('italic')"
        (click)="actionItalic()">
        <mat-icon>format_italic</mat-icon>
      </button>
      <button
        title="Strike"
        [class.active]="editor().isActive('strike')"
        (click)="actionStrike()">
        <mat-icon>strikethrough_s</mat-icon>
      </button>

      <button
        title="Link"
        class="button"
        [class.active]="isActiveLink()"
        (click)="commandLink()">
        <mat-icon>link</mat-icon>
      </button>
    </div>
  `,
  styleUrls: ['../options.scss', './option-format.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatIconModule],
})
export class OptionFormatComponent {
  editor = input.required<Editor>();

  cd = inject(ChangeDetectorRef);
  #toolbarEditorService = inject(ToolbarEditorService);

  actionBold() {
    this.editor().chain().focus().toggleBold().run();
  }

  actionItalic() {
    this.editor().chain().focus().toggleItalic().run();
  }

  actionStrike() {
    this.editor().chain().focus().toggleStrike().run();
  }

  isActiveLink() {
    return this.editor().isActive('link');
  }

  useLink() {
    return this.editor()
      .chain()
      .focus()
      .extendMarkRange('link')
      .unsetLink()
      .run();
  }

  commandLink() {
    if (this.isActiveLink()) {
      this.useLink();

      return;
    }

    const previousUrl = this.editor().getAttributes('link')['href'] ?? '';

    const url = prompt('Link url', previousUrl);

    if (url === null) {
      return;
    }

    // unset link
    if (url === '') {
      this.useLink();

      return;
    }

    // update link
    this.editor()
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();
  }

  constructor() {
    this.#toolbarEditorService.events$
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.cd.detectChanges();
      });
  }
}
