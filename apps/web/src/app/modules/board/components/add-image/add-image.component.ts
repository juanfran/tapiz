import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AutoFocusDirective } from '../../directives/autofocus.directive';

@Component({
  selector: 'tapiz-add-image',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    AutoFocusDirective,
  ],
  template: `
    <form
      class="image-by-url-form"
      [formGroup]="imageForm"
      (submit)="newImageByUrl()">
      <label for="image-url">Image url</label>
      <div class="add-image-row">
        <input
          type="url"
          id="image-url"
          tapizAutofocus
          formControlName="url"
          autocomplete="off"
          matInput
          class="image-url-field" />
        <button
          mat-mini-fab
          color="primary"
          aria-label="Add image by url">
          <mat-icon>check</mat-icon>
        </button>
      </div>
    </form>
  `,
  styleUrl: './add-image.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddImageComponent {
  imageForm = new FormGroup({
    url: new FormControl('', {
      validators: [Validators.required, Validators.pattern(/^https?:\/\/.+/)],
      nonNullable: true,
    }),
  });

  newImage = output<string>();

  newImageByUrl() {
    const url = this.imageForm.value.url;

    if (this.imageForm.valid && url) {
      this.newImage.emit(url);
      this.imageForm.reset();
    }
  }
}
