import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
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
import type { Space } from '@tapiz/board-commons';
import { BoardApiService } from '../../../../services/board-api.service';

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
        <div class="boards">
          <div class="boards-inner">
            @for (board of boards(); track index; let index = $index) {
              @if (boardsForm.controls.at($index); as boardControl) {
                <div class="board-item">
                  <mat-checkbox
                    color="primary"
                    [formControl]="boardControl">
                    {{ board.name }}
                  </mat-checkbox>
                </div>
              }
            }
          </div>
        </div>
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
    teamId: string;
    space?: Space;
  }>(MAT_DIALOG_DATA);
  #dialogRef = inject(MatDialogRef);
  boardApiService = inject(BoardApiService);

  form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    boards: new FormArray([] as FormControl[]),
  });

  teamId = signal('');

  boardsResource = resource({
    request: () => ({ id: this.teamId() }),
    loader: ({ request }) => {
      if (!request.id) {
        return Promise.resolve([]);
      }

      return this.boardApiService.fetchAllTeamBoards(request.id);
    },
  });

  boards = computed(() => {
    return this.boardsResource.value() ?? [];
  });

  get boardsForm() {
    return this.form.controls.boards;
  }

  constructor() {
    this.teamId.set(this.data.teamId);

    effect(() => {
      const boards = this.boards();

      boards.forEach((board) => {
        const selected = this.data.space?.boards.some(
          (it) => it.id === board.id,
        );
        this.boardsForm.push(new FormControl(selected));
      });
    });

    if (this.data.space) {
      this.form.patchValue({
        name: this.data.space.name,
      });
    }
  }

  submit() {
    if (this.form.valid) {
      const boards = this.boards()
        .filter((_, index) => this.boardsForm.at(index).value)
        .map((board) => board.id);
      this.#dialogRef.close({
        name: this.form.value.name,
        boards,
      });
    }
  }
}
