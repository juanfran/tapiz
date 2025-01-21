import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DrawingStore } from '../drawing/drawing.store';
import { ColorPickerComponent } from '@tapiz/ui/color-picker';
@Component({
  selector: 'tapiz-drawing-options',
  templateUrl: './drawing-options.component.html',
  styleUrls: ['./drawing-options.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule, ColorPickerComponent],
})
export class DrawingOptionsComponent {
  #drawingStore = inject(DrawingStore);

  defaultColor = 'rgba(0, 0, 0, 1)';

  form = new FormGroup({
    color: new FormControl(this.defaultColor, { nonNullable: true }),
    size: new FormControl(5, { nonNullable: true }),
  });

  constructor() {
    this.form.patchValue({
      color: this.#drawingStore.color(),
      size: this.#drawingStore.size(),
    });

    this.form.valueChanges.subscribe((value) => {
      if (this.form.valid && value.color && value.size) {
        this.#drawingStore.actions.setDrawingParams({
          color: value.color,
          size: value.size,
        });
      }
    });
  }

  clean() {
    this.#drawingStore.actions.cleanDrawing();
  }

  undo() {
    this.#drawingStore.actions.undoDrawing();
  }

  redo() {
    this.#drawingStore.actions.redoDrawing();
  }

  updateColor(color: string | undefined) {
    this.form.patchValue({ color: color ?? this.defaultColor });
  }
}
