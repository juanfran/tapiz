import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { homeFeature } from '../../+state/home.feature';
import { MatSelectModule } from '@angular/material/select';
import { ModalHeaderComponent } from '../../../../shared/modal-header/modal-header.component';

@Component({
  selector: 'tapiz-transfer-board',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ModalHeaderComponent,
    MatSelectModule,
  ],
  template: `
    <tapiz-modal-header title="Transfer board"></tapiz-modal-header>
    <form
      [formGroup]="form"
      (submit)="submit()">
      <mat-form-field>
        <mat-label>Team</mat-label>
        <mat-select formControlName="team">
          <mat-option [value]="null">No team</mat-option>
          @for (team of teams(); track team) {
            <mat-option [value]="team.id">{{ team.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <div class="actions">
        <button
          [disabled]="!form.valid"
          class="submit"
          type="submit"
          mat-raised-button
          color="primary">
          Transfer
        </button>
      </div>
    </form>
  `,
  styleUrls: ['./transfer-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferBoardComponent {
  public data = inject(MAT_DIALOG_DATA);
  public store = inject(Store);
  public dialogRef = inject(MatDialogRef);
  public form = new FormGroup({
    team: new FormControl(this.data.teamId, {
      nonNullable: true,
    }),
  });

  public teams = this.store.selectSignal(homeFeature.selectTeams);

  public submit() {
    if (this.form.valid) {
      this.dialogRef.close({
        teamId: this.form.value.team,
      });
    }
  }

  public cancel() {
    this.dialogRef.close();
  }
}
