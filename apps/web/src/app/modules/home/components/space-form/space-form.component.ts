import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { BoardUser, Space } from '@tapiz/board-commons';

@Component({
  selector: 'tapiz-space-form',
  styleUrls: ['./space-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
  ],
  template: `
    <form
      [formGroup]="form"
      (submit)="submit()">
      <h1>Space</h1>
      <div class="row-emails">
        <mat-form-field>
          <input
            formControlName="name"
            placeholder="Space name"
            matInput
            type="text" />
        </mat-form-field>
      </div>
      <div class="row-boards">
        <h2>Select Boards</h2>
        @for (boardCtrl of boards.controls; track index; let index = $index) {
          <div class="board-item">
            <mat-checkbox
              color="primary"
              [formControl]="boardCtrl">
              {{ data.boards[index].name }}
            </mat-checkbox>
          </div>
        }
      </div>
      <div class="actions">
        <button
          [disabled]="!form.valid"
          class="submit"
          type="submit"
          mat-raised-button
          color="primary">
          Save
        </button>
      </div>
    </form>
  `,
})
export class SpaceFormComponent {
  data = inject<{
    name: string;
    boards: BoardUser[];
    space?: Space;
  }>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef);

  form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    boards: new FormArray([] as FormControl[]),
  });

  get boards() {
    return this.form.controls.boards;
  }

  constructor() {
    this.data.boards.forEach((board) => {
      const selected = this.data.space?.boards.some((it) => it.id === board.id);

      this.boards.push(new FormControl(selected));
    });

    if (this.data.space) {
      this.form.patchValue({
        name: this.data.space.name,
      });
    }
  }

  submit() {
    if (this.form.valid) {
      const boards = this.data.boards
        .filter((_, index) => this.boards.at(index).value)
        .map((board) => board.id);

      this.dialogRef.close({
        name: this.form.value.name,
        boards,
      });
    }
  }
}
