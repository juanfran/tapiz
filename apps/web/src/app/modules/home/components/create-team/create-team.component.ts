import { ModalHeaderComponent } from '../../../../shared/modal-header/modal-header.component';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'tapiz-create-team',
  template: `
    <tapiz-modal-header title="New team"></tapiz-modal-header>

    <form
      [formGroup]="form"
      (submit)="submit()">
      <mat-form-field>
        <mat-label>Team name</mat-label>
        <input
          formControlName="name"
          matInput
          type="text" />
      </mat-form-field>

      <div class="actions">
        <button
          class="submit"
          type="submit"
          mat-raised-button
          color="primary">
          Save
        </button>
        <button
          (click)="cancel()"
          class="cancel"
          type="button"
          mat-raised-button
          color="warn">
          Cancel
        </button>
      </div>
    </form>
  `,
  styleUrls: ['./create-team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ModalHeaderComponent,
  ],
})
export class CreateTeamComponent {
  public dialogRef = inject(MatDialogRef);
  public form = new FormGroup({
    name: new FormControl('', [Validators.required]),
  });

  public submit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  public cancel() {
    this.dialogRef.close(null);
  }
}
