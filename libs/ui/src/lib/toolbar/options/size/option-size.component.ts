import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Editor } from '@tiptap/core';
import { ToolbarEditorService } from '../../toolbar-editor.service';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'tapiz-toolbar-option-size',
  template: `
    <mat-form-field>
      <mat-select
        [value]="value()"
        (selectionChange)="command($event)">
        @for (size of sizes; track $index) {
          <mat-option [value]="size.value">{{ size.label }}</mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styleUrls: ['../options.scss', './option-size.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatSelectModule, MatFormFieldModule],
})
export class OptionSizeComponent {
  editor = input.required<Editor>();

  cd = inject(ChangeDetectorRef);
  sizes = [
    {
      value: 8,
      label: 'Tiny',
    },
    {
      value: 12,
      label: 'Small',
    },
    {
      value: 24,
      label: 'Default',
    },
    {
      value: 160,
      label: 'Large',
    },
    {
      value: 320,
      label: 'Huge',
    },
  ];
  #defaultFontSize = 24;
  #toolbarEditorService = inject(ToolbarEditorService);

  value = signal<number>(this.#defaultFontSize);

  command(event: MatSelectChange) {
    this.value.set(event.value);
  }

  getAttributes() {
    let attrs = this.editor().getAttributes('heading');
    if (!Object.keys(attrs).length) {
      attrs = this.editor().getAttributes('paragraph');
    }

    return attrs;
  }

  constructor() {
    effect(() => {
      const value = this.value();

      if (value === this.#defaultFontSize) {
        this.editor().chain().focus().unsetFontSize().run();
        return;
      }

      this.editor().chain().focus().setFontSize(String(value)).run();
    });

    this.#toolbarEditorService.events$
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const size = this.sizes.find((size) =>
          this.editor().isActive('textStyle', { fontSize: size.value + 'px' }),
        );

        this.value.set(size ? size.value : this.#defaultFontSize);
        this.cd.detectChanges();
      });
  }
}
