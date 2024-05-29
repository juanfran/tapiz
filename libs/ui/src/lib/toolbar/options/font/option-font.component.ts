import {
  CdkMenuTrigger,
  CdkMenu,
  CdkMenuGroup,
  CdkMenuItemRadio,
  CdkMenuItem,
} from '@angular/cdk/menu';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { Editor } from '@tiptap/core';
import { ToolbarEditorService } from '../../toolbar-editor.service';
import { ColorPickerComponent } from '../../../color-picker';

@Component({
  selector: 'tapiz-toolbar-option-font',
  template: `
    <button
      [cdkMenuTriggerFor]="menu"
      class="standalone-item">
      Font
    </button>

    <ng-template #menu>
      <div
        class="menu"
        cdkMenu>
        @for (option of options; track option.value) {
          <button
            [class.active]="isActiveFont(option.value)"
            (cdkMenuItemTriggered)="commandFont(option.value)"
            cdkMenuItem
            class="menu-item">
            {{ option.name }}
          </button>
        }
      </div>
    </ng-template>

    <label
      [title]="'Font Color'"
      for="color-picker">
      <tapiz-color-picker
        [color]="color() || '#000000'"
        (change)="changeColor($event)" />
    </label>
  `,
  styleUrls: ['../options.scss', './option-font.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatIconModule,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuGroup,
    CdkMenuItemRadio,
    CdkMenuItem,
    ColorPickerComponent,
  ],
})
export class OptionFontComponent {
  editor = input.required<Editor>();

  options = [
    {
      type: 'text',
      name: 'Default',
      value: 'raleway',
    },
    {
      type: 'text',
      name: 'Sans',
      value: 'sans',
    },
    {
      type: 'text',
      name: 'Serif',
      value: 'serif',
    },
    {
      type: 'text',
      name: 'Mono',
      value: 'mono',
    },
    {
      type: 'text',
      name: 'Handwriting',
      value: 'handwritting',
    },
  ];

  color = signal<string>('#000000');

  #toolbarEditorService = inject(ToolbarEditorService);

  constructor() {
    this.#toolbarEditorService.events$
      .pipe(takeUntilDestroyed())
      .subscribe((editor) => {
        const color = editor.getAttributes('textStyle')['color'] ?? '#000000';

        this.color.set(color);
      });
  }

  isActiveFont(fontOption: string) {
    if (fontOption === 'raleway') {
      return false;
    }

    const fontFamily = this.#getFontFamily(fontOption);

    return this.editor().isActive('textStyle', {
      fontFamily,
    });
  }

  commandFont(value: string) {
    if (value === 'raleway') {
      this.editor().chain().focus().unsetFontFamily().run();

      return;
    }

    const font = this.#getFontFamily(value);

    this.editor().chain().focus().setFontFamily(font).run();
  }

  changeColor(color: string | undefined) {
    this.editor()
      .chain()
      .focus()
      .setColor(color ?? '#000')
      .run();
  }

  #getFontFamily(value: string) {
    return getComputedStyle(document.body).getPropertyValue(`--font-${value}`);
  }
}
