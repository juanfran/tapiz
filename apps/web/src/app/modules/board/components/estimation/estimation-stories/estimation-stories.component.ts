import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  viewChild,
  viewChildren,
} from '@angular/core';

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
import { RichTextEditorComponent } from '@tapiz/ui/rich-text-editor';

export { BoardActions } from '@tapiz/board-commons/actions/board.actions';

@Component({
  selector: 'tapiz-estimation-stories',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    RichTextEditorComponent,
  ],
  template: `
    <form
      (ngSubmit)="save()"
      [formGroup]="form">
      <div class="stories-header">
        <div>
          <h2>Stories</h2>
          <p>
            {{ stories.length }}
            {{ stories.length === 1 ? 'story' : 'stories' }}
          </p>
        </div>
        <button
          type="button"
          (click)="closeConfig.emit()"
          mat-icon-button
          aria-label="Close stories">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div
        #storiesList
        board-noscroll
        class="stories-list">
        @for (story of stories; track story; let i = $index) {
          <section
            #storyItem
            class="story"
            [formGroup]="story">
            <div class="story-header">
              <h3>Story {{ i + 1 }}</h3>
              <button
                type="button"
                (click)="deleteStory(i)"
                mat-icon-button
                color="warn"
                aria-label="Delete story">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
            <div class="fields">
              <mat-form-field>
                <mat-label>Story title</mat-label>
                <input
                  #storyTitle
                  matInput
                  formControlName="title"
                  type="text" />
              </mat-form-field>
              <div class="description-field">
                <span
                  [id]="'story-description-' + i"
                  class="field-label">
                  Description
                </span>
                <tapiz-rich-text-editor
                  [attr.aria-labelledby]="'story-description-' + i"
                  formControlName="description" />
              </div>
            </div>
          </section>
        }
      </div>

      <div class="actions">
        <button
          class="add-story-action"
          type="button"
          (click)="addEmptyStory()"
          mat-stroked-button
          color="primary">
          <mat-icon>add</mat-icon>
          Add story
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
        <button
          class="submit"
          type="submit"
          mat-raised-button
          color="primary">
          Save
        </button>
      </div>
    </form>
  `,
  styleUrls: ['./estimation-stories.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstimationStoriesComponent implements OnInit {
  private storyItems = viewChildren<ElementRef<HTMLElement>>('storyItem');
  private storyTitleInputs =
    viewChildren<ElementRef<HTMLInputElement>>('storyTitle');
  private storiesList = viewChild<ElementRef<HTMLElement>>('storiesList');

  estimationStories = input.required<EstimationStory[]>();

  showCancel = input(false);

  addStory = output<EstimationStory[]>();

  closeConfig = output<void>();

  get stories() {
    return this.form.controls.stories.controls;
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
    stories: new FormArray<
      FormGroup<{
        id: FormControl<string>;
        title: FormControl<string>;
        description: FormControl<string>;
        show: FormControl<boolean>;
      }>
    >([]),
  });

  deleteStory(index: number) {
    const stories = this.form.controls.stories;

    stories.removeAt(index);
  }

  addEmptyStory() {
    this.add();
    this.scrollToStory(this.stories.length - 1);
  }

  add(
    data: EstimationStory = {
      id: v4(),
      title: '',
      description: '',
      show: false,
    },
  ) {
    const stories = this.form.controls.stories;

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
      this.focusFirstInvalidStory();
      return;
    }

    const stories: EstimationStory[] = this.form.getRawValue().stories;

    this.addStory.emit(stories);
  }

  private focusFirstInvalidStory() {
    const firstInvalidIndex = this.stories.findIndex((story) => {
      return story.invalid;
    });

    if (firstInvalidIndex < 0) {
      return;
    }

    this.scrollToStory(firstInvalidIndex);
  }

  private scrollToStory(index: number) {
    window.setTimeout(() => {
      const list = this.storiesList()?.nativeElement;
      const story = this.storyItems().at(index);
      const title = this.storyTitleInputs().at(index);

      if (list && story) {
        list.scrollTo({
          top: story.nativeElement.offsetTop - list.offsetTop,
          behavior: 'smooth',
        });
      }

      title?.nativeElement.focus();
    });
  }
}
