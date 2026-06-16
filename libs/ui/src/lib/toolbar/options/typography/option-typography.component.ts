import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { Editor } from '@tiptap/core';
import { ToolbarEditorService } from '../../toolbar-editor.service';

type FontSizeValue = `font-size:${number}`;
type TypographyValue = 'default' | FontSizeValue;

interface TypographyOption {
  label: string;
  value: TypographyValue;
}

@Component({
  selector: 'tapiz-toolbar-option-typography',
  template: `
    <mat-form-field>
      <mat-select
        aria-label="Text size"
        [value]="value()"
        (selectionChange)="command($event)">
        @for (option of sizeOptions; track option.value) {
          <mat-option [value]="option.value">{{ option.label }}</mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styleUrls: ['../options.scss', './option-typography.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatSelectModule, MatFormFieldModule],
})
export class OptionTypographyComponent {
  editor = input.required<Editor>();

  cd = inject(ChangeDetectorRef);
  #toolbarEditorService = inject(ToolbarEditorService);
  #defaultFontSize = 24;

  sizeOptions: TypographyOption[] = [
    {
      label: 'Default',
      value: 'default',
    },
    ...[
      8, 10, 12, 14, 16, 18, 20, 28, 32, 40, 48, 64, 80, 96, 128, 160, 240, 320,
    ].map((size) => ({
      label: `${size} px`,
      value: `font-size:${size}` as const,
    })),
  ];

  value = signal<TypographyValue>('default');

  constructor() {
    this.#toolbarEditorService.events$
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.value.set(this.getCurrentValue());
        this.cd.detectChanges();
      });
  }

  command(event: MatSelectChange) {
    const value = event.value as TypographyValue;
    this.value.set(value);

    if (value === 'default') {
      this.setDefaultSize();
      return;
    }

    this.setFontSize(Number(value.replace('font-size:', '')));
  }

  getCurrentValue(): TypographyValue {
    const fontSize = this.editor().getAttributes('textStyle')['fontSize'];
    const normalizedFontSize = this.parseFontSize(fontSize);

    if (normalizedFontSize) {
      if (normalizedFontSize === this.#defaultFontSize) {
        return 'default';
      }

      return `font-size:${normalizedFontSize}`;
    }

    return 'default';
  }

  private setFontSize(fontSize: number) {
    const commands = this.getParagraphCommands();

    commands.setFontSize(`${fontSize}px`).run();
  }

  private setDefaultSize() {
    const commands = this.getParagraphCommands();

    commands.unsetFontSize().run();
  }

  private getParagraphCommands() {
    const attributes = this.getBlockAttributes();
    const commands = this.editor().chain().focus().setParagraph();

    if (attributes['textAlign']) {
      commands.setTextAlign(attributes['textAlign']);
    }

    return commands;
  }

  private getBlockAttributes() {
    let attrs = this.editor().getAttributes('heading');
    if (!Object.keys(attrs).length) {
      attrs = this.editor().getAttributes('paragraph');
    }

    return attrs;
  }

  private parseFontSize(value: unknown): number | null {
    if (typeof value !== 'string') {
      return null;
    }

    const fontSize = Number(value.replace('px', ''));
    if (Number.isNaN(fontSize)) {
      return null;
    }

    return fontSize;
  }
}
