import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Editor } from '@tiptap/core';
import { Level } from '@tiptap/extension-heading';
import { ToolbarEditorService } from '../../toolbar-editor.service';

@Component({
  selector: 'tapiz-toolbar-option-heading',
  template: `
    <div class="buttons">
      <button
        title="Paragraph"
        [class.active]="active('')"
        (click)="command('')">
        P
      </button>
      <button
        title="Medium"
        [class.active]="active('3')"
        (click)="command('3')">
        H3
      </button>
      <button
        title="Large"
        [class.active]="active('2')"
        (click)="command('2')">
        H2
      </button>
      <button
        title="H1"
        [class.active]="active('1')"
        (click)="command('1')">
        H1
      </button>
    </div>
  `,
  styleUrls: ['../options.scss', './option-heading.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
})
export class OptionHeadingComponent {
  editor = input.required<Editor>();

  cd = inject(ChangeDetectorRef);
  #toolbarEditorService = inject(ToolbarEditorService);

  active(level: string) {
    if (!level) {
      return this.editor().isActive('paragraph');
    }

    return this.editor().isActive('heading', { level: Number(level) });
  }

  command(value: string) {
    const attributes = this.getAttributes();

    if (value) {
      this.editor()
        .chain()
        .focus()
        .unsetFontSize()
        .toggleHeading({
          ...attributes,
          level: Number(value) as Level,
        })
        .run();
    } else {
      const commands = this.editor().chain().focus().setParagraph();

      if (attributes['textAlign']) {
        commands.setTextAlign(attributes['textAlign']);
      }

      commands.run();
    }
  }

  getAttributes() {
    let attrs = this.editor().getAttributes('heading');
    if (!Object.keys(attrs).length) {
      attrs = this.editor().getAttributes('paragraph');
    }

    return attrs;
  }

  constructor() {
    this.#toolbarEditorService.events$
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.cd.detectChanges();
      });
  }
}
