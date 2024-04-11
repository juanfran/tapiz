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
  selector: 'team-up-toolbar-option-align',
  template: `
    <div class="buttons">
      <button
        title="Align Left"
        [class.active]="editor().isActive({ textAlign: 'left' })"
        (click)="command('left')">
        <mat-icon>format_align_left</mat-icon>
      </button>
      <button
        title="Align Center"
        [class.active]="this.editor().isActive({ textAlign: 'center' })"
        (click)="command('center')">
        <mat-icon>format_align_center</mat-icon>
      </button>
      <button
        title="Align Right"
        [class.active]="editor().isActive({ textAlign: 'right' })"
        (click)="command('right')">
        <mat-icon>format_align_right</mat-icon>
      </button>
    </div>
  `,
  styleUrls: ['../options.scss', './option-align.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatIconModule],
})
export class OptionAlignComponent {
  editor = input.required<Editor>();

  cd = inject(ChangeDetectorRef);
  #toolbarEditorService = inject(ToolbarEditorService);

  command(aligment: string) {
    this.editor().chain().focus().setTextAlign(aligment).run();
  }

  constructor() {
    this.#toolbarEditorService.events$
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.cd.detectChanges();
      });
  }
}
