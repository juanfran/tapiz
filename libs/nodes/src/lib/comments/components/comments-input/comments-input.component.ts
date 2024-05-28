import { TextFieldModule } from '@angular/cdk/text-field';
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { v4 } from 'uuid';
import { CommentNode } from '@tapiz/board-commons';

@Component({
  selector: 'tapiz-comments-input',
  standalone: true,
  imports: [
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    TextFieldModule,
  ],
  template: `
    <form (ngSubmit)="submit()">
      <mat-form-field>
        <textarea
          (keydown.enter)="submitEnter($event)"
          matInput
          [formControl]="text"
          cdkTextareaAutosize
          #autosize="cdkTextareaAutosize"
          cdkAutosizeMinRows="1"></textarea>
      </mat-form-field>

      <button
        type="submit"
        mat-icon-button
        aria-label="Send comment">
        <mat-icon>send</mat-icon>
      </button>
    </form>
  `,
  styleUrls: ['./comments-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentsInputComponent {
  parentId = input.required<string>();
  userId = input.required<string>();

  text = new FormControl('', {
    nonNullable: true,
  });

  newComment = output<CommentNode>();

  submitEnter(event: Event) {
    if (!(event as KeyboardEvent).shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }

  submit() {
    if (!this.text.value.trim().length) {
      return;
    }

    const comment: CommentNode = {
      id: v4(),
      type: 'comment',
      content: {
        text: this.text.value,
        userId: this.userId(),
        date: Date.now(),
      },
    };

    this.newComment.emit(comment);
    this.text.reset();
  }
}
