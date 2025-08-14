import {
  afterNextRender,
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
import { BoardPageActions } from '../../actions/board-page.actions';
import { v4 } from 'uuid';
import { BoardFacade } from '../../../../services/board-facade.service';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { ColorPickerComponent } from '@tapiz/ui/color-picker';
import { MatLabel } from '@angular/material/select';

export const defaultBackgroundColor = '#f7f6f7';
export const defaultDotsColor = '#bfc6d7';

@Component({
  selector: 'tapiz-board-settings',
  imports: [
    MatIconModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    ColorPickerComponent,
    MatLabel,
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
          formControlName="hideNoteAuthor">
          <span class="label-text">Hide note author</span>
        </mat-checkbox>
        <span class="help"
          >The note author will be stored but will not be displayed to other
          users. Additionally, users can't highlight other users' notes.</span
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

      <div class="field">
        <mat-checkbox
          color="primary"
          formControlName="allowPublicPosts">
          <span class="label-text">Allow public posts</span>
        </mat-checkbox>
        <span class="help"
          >When enabled, any user can make their posts public, not just admins
          and post owners.</span
        >
      </div>

      <div class="field">
        <div class="color-picker-field">
          <tapiz-color-picker
            [disabled]="!isAdmin()"
            [color]="form.value.backgroundColor"
            mode="RGBA"
            (changed)="updateBackgroundColor($event)" />

          <mat-label>
            <span
              [class.disabled]="!isAdmin()"
              class="label-text"
              >Background color</span
            >
          </mat-label>
        </div>
        <span class="help">The background color of the board.</span>
      </div>

      <div class="field">
        <div class="color-picker-field">
          <tapiz-color-picker
            [disabled]="!isAdmin()"
            [color]="form.value.dotsColor"
            mode="RGBA"
            (changed)="updateDotsColor($event)" />

          <mat-label>
            <span
              class="label-text"
              [class.disabled]="!isAdmin()"
              >Background dots color</span
            >
          </mat-label>
        </div>
        <span class="help"
          >The color of the dots that will be displayed on the board.
        </span>
      </div>

      <div class="field action-field">
        <div class="action-field-content">
          <mat-label>
            <span
              class="label-text"
              [class.disabled]="!isAdmin()"
              >Set board center</span
            >
          </mat-label>

          <button
            type="button"
            [disabled]="!isAdmin()"
            mat-flat-button
            color="primary"
            (click)="setInitialPosition()">
            Set center
          </button>
        </div>

        <span class="help"
          >This will set the starting position of the board for new users.</span
        >
      </div>

      @if (isAdmin()) {
        <div class="form-actions">
          <button
            type="submit"
            color="primary"
            mat-flat-button>
            Save
          </button>
        </div>
      }
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

  isAdmin = this.#store.selectSignal(boardPageFeature.selectIsAdmin);

  form = new FormGroup({
    readOnly: new FormControl(false),
    anonymousMode: new FormControl(false),
    hideNoteAuthor: new FormControl(false),
    allowPublicPosts: new FormControl(false),
    backgroundColor: new FormControl(defaultBackgroundColor, {
      nonNullable: true,
    }),
    dotsColor: new FormControl(defaultDotsColor, { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const settings = this.#settings();

      if (settings) {
        this.form.patchValue(settings.content);
      }
    });

    afterNextRender(() => {
      if (!this.isAdmin()) {
        this.form.disable();
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

  updateBackgroundColor(color: string | undefined) {
    this.form
      .get('backgroundColor')
      ?.patchValue(color ?? defaultBackgroundColor);
  }

  updateDotsColor(color: string | undefined) {
    this.form.get('dotsColor')?.patchValue(color ?? defaultDotsColor);
  }

  setInitialPosition() {
    this.#store.dispatch(
      BoardPageActions.setShowSetBoardCenter({
        show: true,
      }),
    );
    this.#dialogRef.close();
  }
}
