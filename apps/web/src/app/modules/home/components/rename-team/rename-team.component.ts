import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'tapiz-rename-team',
  styleUrls: ['./rename-team.component.scss'],
  template: `
    <form
      [formGroup]="form"
      (submit)="submit()">
      <h1>Rename team</h1>
      <div class="row-emails">
        <mat-form-field>
          <input
            formControlName="name"
            placeholder="Team name"
            matInput
            type="text" />
        </mat-form-field>
      </div>
      <div class="actions">
        <button
          [disabled]="!form.valid"
          class="submit"
          type="submit"
          mat-raised-button
          color="primary">
          Rename
        </button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
})
export class RenameTeamComponent {
  public data = inject<{
    name: string;
  }>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef);

  public form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

  constructor() {
    this.form.patchValue({
      name: this.data.name,
    });
  }

  public submit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value.name);
    }
  }
}
