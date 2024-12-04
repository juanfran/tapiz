import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModalHeaderComponent } from '../../../../shared/modal-header/modal-header.component';
import { Store } from '@ngrx/store';
import { homeFeature } from '../../+state/home.feature';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'tapiz-create-board',
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
    <tapiz-modal-header title="Create board"></tapiz-modal-header>
    <form
      [formGroup]="form"
      (submit)="submit()">
      <mat-form-field [hideRequiredMarker]="true">
        <mat-label>Board name</mat-label>
        <input
          [maxLength]="255"
          formControlName="name"
          placeholder="Board name"
          matInput
          type="text" />
      </mat-form-field>
      @if (teams().length) {
        <mat-form-field>
          <mat-label>Choose a team...</mat-label>
          <mat-select formControlName="team">
            @for (team of teams(); track team) {
              <mat-option [value]="team.id">{{ team.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
      <div class="actions">
        <button
          [disabled]="!form.valid"
          class="submit"
          type="submit"
          mat-raised-button
          color="primary">
          Create board
        </button>
      </div>
    </form>
  `,
  styleUrls: ['./create-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateBoardComponent {
  public data = inject(MAT_DIALOG_DATA);
  public store = inject(Store);
  public dialogRef = inject(MatDialogRef);
  public form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    team: new FormControl(this.data.teamId, {
      nonNullable: true,
    }),
  });

  public teams = this.store.selectSignal(homeFeature.selectTeams);

  public submit() {
    if (this.form.valid) {
      this.dialogRef.close({
        name: this.form.value.name,
        teamId: this.form.value.team,
      });
    }
  }

  public cancel() {
    this.dialogRef.close();
  }
}
