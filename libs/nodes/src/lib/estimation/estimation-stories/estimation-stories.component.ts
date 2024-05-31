import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { EstimationStory } from '@tapiz/board-commons';
import { v4 } from 'uuid';
import { output } from '@angular/core';
import { input } from '@angular/core';

export { BoardActions } from '@tapiz/board-commons/actions/board.actions';

@Component({
  selector: 'tapiz-estimation-stories',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
  ],
  template: `
    <form
      (ngSubmit)="save()"
      [formGroup]="form">
      @for (story of stories; track story; let i = $index) {
        <div class="story">
          <ng-container [formGroup]="story">
            <div class="fields">
              <mat-form-field>
                <mat-label>Story title</mat-label>
                <input
                  matInput
                  formControlName="title"
                  type="text" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>Description</mat-label>
                <textarea
                  matInput
                  formControlName="description"></textarea>
              </mat-form-field>
            </div>
            <button
              type="button"
              (click)="deleteStory(i)"
              mat-mini-fab
              color="warn"
              aria-label="Delete story">
              <mat-icon>delete</mat-icon>
            </button>
          </ng-container>
        </div>
      }

      <button
        class="add-story"
        type="button"
        (click)="add()"
        mat-mini-fab
        color="primary"
        aria-label="Add story">
        <mat-icon>add</mat-icon>
      </button>

      <div class="actions">
        <button
          class="submit"
          type="submit"
          mat-raised-button
          color="primary">
          Save
        </button>

        @if (showCancel()) {
          <button
            type="button"
            (click)="closeConfig.emit()"
            mat-raised-button
            color="warn">
            Cancel
          </button>
        }
      </div>
    </form>
  `,
  styleUrls: ['./estimation-stories.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstimationStoriesComponent implements OnInit {
  estimationStories = input.required<EstimationStory[]>();

  showCancel = input(false);

  addStory = output<EstimationStory[]>();

  closeConfig = output<void>();

  get stories() {
    return (this.form.get('stories') as FormArray).controls as FormGroup[];
  }

  ngOnInit(): void {
    if (!this.estimationStories().length) {
      this.add();
    } else {
      this.estimationStories().forEach((story) => {
        this.add(story);
      });
    }
  }

  form = new FormGroup({
    stories: new FormArray([]),
  });

  deleteStory(index: number) {
    const stories = this.form.get('stories') as FormArray;

    stories.removeAt(index);
  }

  add(
    data: EstimationStory = {
      id: v4(),
      title: '',
      description: '',
      show: false,
    },
  ) {
    const stories = this.form.get('stories') as FormArray;

    stories.push(
      new FormGroup({
        id: new FormControl(data.id, { nonNullable: true }),
        title: new FormControl(data.title, {
          nonNullable: true,
          validators: [Validators.required],
        }),
        description: new FormControl(data.description, { nonNullable: true }),
        show: new FormControl(data.show, { nonNullable: true }),
      }),
    );
  }

  save() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    const stories = this.form.value.stories as EstimationStory[];

    this.addStory.emit(stories);
  }
}
