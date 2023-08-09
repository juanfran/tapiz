import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { ModalHeaderComponent } from '@/app/shared/modal-header/modal-header.component';
import { Store } from '@ngrx/store';
import { homeFeature } from '../../+state/home.feature';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'team-up-create-board',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ModalHeaderComponent,
    MatSelectModule,
  ],
  template: `
    <team-up-modal-header title="Create board"></team-up-modal-header>
    <form
      class="invite-by-email"
      [formGroup]="form"
      (submit)="submit()">
      <mat-form-field [hideRequiredMarker]="true">
        <mat-label>Board name</mat-label>
        <input
          formControlName="name"
          placeholder="Board name"
          matInput
          type="text" />
      </mat-form-field>
      <mat-form-field>
        <mat-label>Team</mat-label>
        <mat-select formControlName="team">
          <mat-option
            *ngFor="let team of teams()"
            [value]="team.id"
            >{{ team.name }}</mat-option
          >
        </mat-select>
      </mat-form-field>
      <div class="actions">
        <button
          [disabled]="!form.valid"
          class="submit"
          type="submit"
          mat-raised-button
          color="primary">
          Create
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
