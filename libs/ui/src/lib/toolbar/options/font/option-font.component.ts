import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Editor } from '@tiptap/core';
import { ToolbarEditorService } from '../../toolbar-editor.service';
import { ColorPickerComponent } from '../../../color-picker';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  defaultNoteFontFamily,
  noteFontFamilyOptions,
} from '@tapiz/board-commons';

@Component({
  selector: 'tapiz-toolbar-option-font',
  template: `
    <mat-form-field>
      <mat-select
        [value]="fontFamilyValue()"
        (selectionChange)="command($event)">
        @for (option of options; track $index) {
          <mat-option [value]="option.value">{{ option.name }}</mat-option>
        }
      </mat-select>
    </mat-form-field>

    <label
      class="color-picker"
      [title]="'Font Color'"
      for="color-picker">
      <tapiz-color-picker
        [color]="color() || defaultTextColor()"
        (changed)="changeColor($event)" />
    </label>
  `,
  styleUrls: ['../options.scss', './option-font.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatSelectModule, MatFormFieldModule, ColorPickerComponent],
})
export class OptionFontComponent {
  editor = input.required<Editor>();
  defaultTextColor = input('#000000');

  options = noteFontFamilyOptions;

  color = signal<string | null>(null);

  #defaultFontFamily = defaultNoteFontFamily;
  fontFamilyValue = signal<string>(this.#defaultFontFamily);

  #toolbarEditorService = inject(ToolbarEditorService);

  constructor() {
    afterNextRender(() => {
      const color =
        this.editor().getAttributes('textStyle')['color'] ?? '#000000';
      this.color.set(color);
    });

    effect(() => {
      const value = this.fontFamilyValue();

      if (value === this.#defaultFontFamily) {
        this.editor().chain().focus().unsetFontFamily().run();
        return;
      }

      this.editor().chain().focus().setFontFamily(value).run();
    });

    this.#toolbarEditorService.events$
      .pipe(takeUntilDestroyed())
      .subscribe((editor) => {
        const fontFamily = this.options.find((font) => {
          return this.editor().isActive('textStyle', {
            fontFamily: font.value,
          });
        });

        this.fontFamilyValue.set(
          fontFamily ? fontFamily.value : this.#defaultFontFamily,
        );

        const color = editor.getAttributes('textStyle')['color'] ?? '#000000';

        this.color.set(color);
      });
  }

  command(event: MatSelectChange) {
    this.fontFamilyValue.set(event.value);
  }

  changeColor(color: string | undefined) {
    const newColor = color ?? '#000';

    this.color.set(newColor);
    this.editor().chain().focus().setColor(newColor).run();
  }
}
