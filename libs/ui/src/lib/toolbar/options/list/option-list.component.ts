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
  selector: 'team-up-toolbar-option-list',
  template: `
    <div class="buttons">
      <button
        title="Bullet list"
        [class.active]="editor().isActive('bulletList')"
        (click)="toggleBulletList()">
        <mat-icon>format_list_bulleted</mat-icon>
      </button>
      <button
        title="Ordered list"
        [class.active]="editor().isActive('orderedList')"
        (click)="toggleOrderedList()">
        <mat-icon>format_list_numbered</mat-icon>
      </button>
    </div>
  `,
  styleUrls: ['../options.scss', './option-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatIconModule],
})
export class OptionListComponent {
  editor = input.required<Editor>();

  cd = inject(ChangeDetectorRef);

  #toolbarEditorService = inject(ToolbarEditorService);

  toggleBulletList() {
    this.editor().chain().focus().toggleBulletList().run();
  }

  toggleOrderedList() {
    this.editor().chain().focus().toggleOrderedList().run();
  }

  constructor() {
    this.#toolbarEditorService.events$
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.cd.detectChanges();
      });
  }
}
