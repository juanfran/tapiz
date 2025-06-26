import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Store } from '@ngrx/store';
import { BoardActions } from '../../actions/board.actions';
import { v4 } from 'uuid';
import { BoardFacade } from '../../../../services/board-facade.service';

@Component({
  selector: 'tapiz-board-settings',
  imports: [
    MatIconModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
  ],
  template: `
    <h1 class="title">
      Board settings
      <button
        type="button"
        [mat-dialog-close]="true">
        <mat-icon>close</mat-icon>
      </button>
    </h1>

    <form
      [formGroup]="form"
      (ngSubmit)="submit()">
      <div class="field">
        <mat-checkbox
          color="primary"
          formControlName="readOnly">
          <span class="label-text">Readonly</span>
        </mat-checkbox>
        <span class="help"
          >Only the board owner and team admin can edit the board.</span
        >
      </div>

      <div class="field">
        <mat-checkbox
          color="primary"
          formControlName="anonymousMode">
          <span class="label-text">Anonymous mode</span>
        </mat-checkbox>
        <span class="help"
          >When this option is enabled, notes created will not store an author
          and all notes will be public. Additionally, the list and cursor
          indicating connected users will be hidden.</span
        >
      </div>

      <div class="form-actions">
        <button
          type="submit"
          color="primary"
          mat-flat-button>
          Save
        </button>
      </div>
    </form>
  `,
  styleUrl: './board-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardSettingsComponent {
  #store = inject(Store);
  #boardFacade = inject(BoardFacade);
  #dialogRef = inject(MatDialogRef);

  #settings = computed(() => {
    return this.#boardFacade.nodes().find((it) => it.type === 'settings');
  });

  form = new FormGroup({
    readOnly: new FormControl(false),
    anonymousMode: new FormControl(false),
  });

  constructor() {
    effect(() => {
      const settings = this.#settings();

      if (settings) {
        this.form.patchValue(settings.content);
      }
    });
  }

  submit() {
    const settings = this.#settings();

    if (settings) {
      this.#store.dispatch(
        BoardActions.batchNodeActions({
          history: false,
          actions: [
            {
              data: {
                type: 'settings',
                id: settings.id,
                content: this.form.value,
              },
              op: 'patch',
            },
          ],
        }),
      );
    } else {
      this.#store.dispatch(
        BoardActions.batchNodeActions({
          history: false,
          actions: [
            {
              data: {
                type: 'settings',
                id: v4(),
                content: this.form.value,
              },
              op: 'add',
            },
          ],
        }),
      );
    }

    this.#dialogRef.close();
  }
}
