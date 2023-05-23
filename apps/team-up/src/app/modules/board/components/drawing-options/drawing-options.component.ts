import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import {
  selectDrawingColor,
  selectDrawingSize,
} from '../../selectors/page.selectors';
import { PageActions } from '../../actions/page.actions';
import { MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'team-up-drawing-options',
  templateUrl: './drawing-options.component.html',
  styleUrls: ['./drawing-options.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule],
})
export class DrawingOptionsComponent {
  store = inject(Store);

  form = new FormGroup({
    color: new FormControl('#000000', { nonNullable: true }),
    size: new FormControl(5, { nonNullable: true }),
  });

  color = this.store.selectSignal(selectDrawingColor);
  size = this.store.selectSignal(selectDrawingSize);

  constructor() {
    this.form.patchValue({
      color: this.color(),
      size: this.size(),
    });

    this.form.valueChanges.subscribe((value) => {
      if (this.form.valid && value.color && value.size) {
        this.store.dispatch(
          PageActions.setDrawingParams({
            color: value.color,
            size: value.size,
          })
        );
      }
    });
  }

  public clean() {
    this.store.dispatch(PageActions.cleanNoteDrawing());
  }
}
