import {
  ChangeDetectionStrategy,
  Component,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { lighter } from '@tapiz/cdk/utils/colors';
import { ColorPickerComponent } from '@tapiz/ui/color-picker';

import { defaultNoteColor } from '@tapiz/nodes/note';

@Component({
  selector: 'tapiz-notes',
  imports: [ColorPickerComponent, MatIconModule],
  template: `
    <div class="list">
      @for (note of notes; track note.color) {
        <div>
          <button
            class="note"
            type="button"
            [style.background]="note.color"
            [style.borderColor]="
              note.color === noteColor() ? 'var(--grey-90)' : note.lightColor
            "
            (click)="selectNote(note.color)"></button>
        </div>
      }

      <div class="custom-color">
        <div
          class="note"
          (click)="selectNoteCustomColor(customColor())"
          [style.borderColor]="
            customColor() === noteColor() ? 'var(--grey-90)' : 'var(--grey-40)'
          "
          [style.background]="customColor()">
          <button
            type="button"
            (click)="openPicker()">
            <mat-icon>color_lens</mat-icon>
          </button>
        </div>

        <div class="color-picker-wrapper">
          <tapiz-color-picker
            #picker
            [color]="customColor()"
            (change)="changeColor($event)" />
        </div>
      </div>
    </div>
  `,
  styleUrl: './notes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesComponent {
  noteColor = model<string>('');
  customColor = signal<string>(localStorage.getItem('customColor') ?? '');
  colorPickerComponent = viewChild<ColorPickerComponent>('picker');

  notes = [
    { color: '#a6caf4' },
    { color: '#88e7e3' },
    { color: '#92d1b2' },
    { color: '#badea7' },
    { color: '#a8d672' },
    { color: '#cfd45f' },
    { color: '#f7d44c' },
    { color: '#f4dd8c' },
    { color: '#fedeb2' },
    { color: '#fbb980' },
    { color: '#ffa4ac' },
    { color: '#ffb8bf' },
    { color: '#d6b4ea' },
    { color: '#ecc5f0' },
    { color: '#b5b5b5' },
    { color: '#000000' },
  ].map((note) => {
    return {
      ...note,
      lightColor: lighter(note.color, 70),
    };
  });

  selectNote(color: string) {
    this.noteColor.set(color);
  }

  selectNoteCustomColor(color: string) {
    if (color) {
      this.selectNote(color);
    } else {
      this.openPicker();
    }
  }

  changeColor(color: string | undefined) {
    if (color) {
      this.customColor.set(color);
      this.selectNote(color);
      localStorage.setItem('customColor', color);
    } else {
      this.customColor.set('');
      this.selectNote(defaultNoteColor);
      localStorage.removeItem('customColor');
    }
  }

  openPicker() {
    this.colorPickerComponent()?.pickr?.show();
  }
}
