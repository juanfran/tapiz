import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  inject,
} from '@angular/core';
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
import { ModalHeaderComponent } from '../../../../shared/modal-header/modal-header.component';

@Component({
  selector: 'team-up-rename-board',
  styleUrls: ['./rename-board.component.scss'],
  template: `
    <form
      [formGroup]="form"
      (submit)="submit()">
      <team-up-modal-header title="Rename board"></team-up-modal-header>
      <div class="row-emails">
        <mat-form-field>
          <input
            formControlName="name"
            placeholder="Board name"
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
    ModalHeaderComponent,
  ],
})
export class RenameBoardComponent {
  private dialogRef = inject(MatDialogRef);

  public form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      name: string;
    },
  ) {
    this.form.patchValue({
      name: data.name,
    });
  }

  public submit() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value.name);
    }
  }
}
