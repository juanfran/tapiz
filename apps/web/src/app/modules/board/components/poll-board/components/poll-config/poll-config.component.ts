import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PollBoard, PollBoardNode, PollOption } from '@tapiz/board-commons';
import { MatIconModule } from '@angular/material/icon';
import { v4 } from 'uuid';
import {
  FormArray,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { output } from '@angular/core';

@Component({
  selector: 'tapiz-poll-config',
  imports: [
    MatButtonModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    @if (node().content; as nodeContent) {
      @if (!nodeContent.mode) {
        <form (ngSubmit)="setMode()">
          <div class="set-mode">
            <label for="anonymous">Is the poll anonymous?</label>
            <input
              [formControl]="anonymousField"
              type="checkbox"
              name="mode"
              value="anonymous"
              id="anonymous" />
          </div>

          <button
            class="submit"
            type="submit"
            mat-raised-button
            color="primary">
            Set poll mode
          </button>
        </form>
      } @else if (!nodeContent.title) {
        <form
          class="poll-title"
          (ngSubmit)="setPollTitle()">
          <mat-form-field [hideRequiredMarker]="true">
            <mat-label>Poll title</mat-label>
            <input
              matInput
              [formControl]="titleField"
              type="text" />
          </mat-form-field>
          <button
            [disabled]="!titleField.valid"
            class="submit"
            type="submit"
            mat-raised-button
            color="primary">
            Save poll name
          </button>
        </form>
      } @else if (!nodeContent.options.length) {
        <form (ngSubmit)="submitOption()">
          @for (question of optionsField.controls; track $index) {
            <div class="poll-option">
              <div class="field-wrapper">
                <mat-form-field>
                  <mat-label>Option</mat-label>
                  <input
                    matInput
                    [formControl]="question"
                    type="text" />
                </mat-form-field>
              </div>
              <button
                (click)="deleteOption($index)"
                type="button"
                mat-mini-fab
                color="warn"
                aria-label="Delete option">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          }

          <div class="add-option">
            <button
              type="button"
              mat-mini-fab
              (click)="addOption()"
              color="primary"
              aria-label="Add option">
              <mat-icon>add</mat-icon>
            </button>
          </div>

          <button
            class="submit"
            type="submit"
            mat-raised-button
            color="primary">
            Save
          </button>
        </form>
      }
    }
  `,
  styleUrls: ['./poll-config.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollConfigComponent {
  node = input.required<PollBoardNode>();

  nodeChange = output<Partial<PollBoard>>();

  anonymousField = new FormControl(false);
  titleField = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  optionsField = new FormArray([new FormControl('')]);

  addOption() {
    this.optionsField.push(new FormControl(''));
  }

  setPollTitle() {
    this.nodeChange.emit({
      title: this.titleField.value,
    });
  }

  setMode() {
    this.nodeChange.emit({
      mode: this.anonymousField.value ? 'anonymous' : 'public',
    });
  }

  deleteOption(index: number) {
    this.optionsField.removeAt(index);
  }

  submitOption() {
    const options: PollOption[] = this.optionsField.controls
      .map((control) => control.value)
      .filter((text): text is string => !!text?.trim())
      .map((text) => ({ id: v4(), text }));

    this.nodeChange.emit({
      options,
    });
  }
}
