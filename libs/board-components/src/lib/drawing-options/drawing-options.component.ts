import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DrawingStore } from '../drawing/drawing.store';
@Component({
  selector: 'team-up-drawing-options',
  templateUrl: './drawing-options.component.html',
  styleUrls: ['./drawing-options.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule],
})
export class DrawingOptionsComponent {
  #drawingStore = inject(DrawingStore);

  form = new FormGroup({
    color: new FormControl('#000000', { nonNullable: true }),
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

  public clean() {
    this.#drawingStore.actions.cleanDrawing();
  }

  public undo() {
    this.#drawingStore.actions.undoDrawing();
  }

  public redo() {
    this.#drawingStore.actions.redoDrawing();
  }
}
