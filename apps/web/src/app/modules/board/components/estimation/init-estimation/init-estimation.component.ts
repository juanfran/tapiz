import { ChangeDetectionStrategy, Component, model } from '@angular/core';

import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { EstimationConfig } from '@tapiz/board-commons';
import { output } from '@angular/core';

@Component({
  selector: 'tapiz-init-estimation',
  imports: [MatSelectModule, FormsModule, MatButtonModule],

  template: `
    <form
      (ngSubmit)="onSubmit()"
      #setupEstimation="ngForm">
      <mat-form-field>
        <mat-label>Scale</mat-label>
        <mat-select
          [(ngModel)]="scale"
          name="scale()">
          <mat-option value="t-shirt">T-Shirt</mat-option>
          <mat-option value="fibonacci">Fibonacci</mat-option>
        </mat-select>
      </mat-form-field>

      <div class="actions">
        <button
          class="submit"
          type="submit"
          mat-raised-button
          color="primary">
          Continue
        </button>
      </div>
    </form>
  `,
  styleUrls: ['./init-estimation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InitEstimationComponent {
  scale = model<EstimationConfig['scale']>('t-shirt');

  completeSetup = output<EstimationConfig['scale']>();

  onSubmit() {
    this.completeSetup.emit(this.scale());
  }
}
