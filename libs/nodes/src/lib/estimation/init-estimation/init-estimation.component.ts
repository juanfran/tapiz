import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { EstimationConfig } from '@team-up/board-commons';

@Component({
  selector: 'team-up-init-estimation',
  standalone: true,
  imports: [CommonModule, MatSelectModule, FormsModule, MatButtonModule],
  template: `
    <form
      (ngSubmit)="onSubmit()"
      #setupEstimation="ngForm">
      <mat-form-field>
        <mat-label>Scale</mat-label>
        <mat-select
          [(ngModel)]="scale"
          name="scale">
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
  @Input()
  public scale: EstimationConfig['scale'] = 't-shirt';

  @Output()
  public completeSetup = new EventEmitter<EstimationConfig['scale']>();

  public onSubmit() {
    this.completeSetup.emit(this.scale);
  }
}
