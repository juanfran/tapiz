import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
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
import { ConfigService } from '../../../../services/config.service';

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
    @if (!isDemo) {
      <div class="upload-image">
        <button
          color="primary"
          type="button"
          mat-raised-button
          (click)="fileInput.click()">
          Upload image
        </button>

        <input
          #fileInput
          hidden
          type="file"
          accept="image/*"
          (change)="uploadImage($event)" />
      </div>
    }

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
  #configService = inject(ConfigService);

  get isDemo() {
    return !!this.#configService.config.DEMO;
  }

  imageForm = new FormGroup({
    url: new FormControl('', {
      validators: [Validators.required, Validators.pattern(/^https?:\/\/.+/)],
      nonNullable: true,
    }),
  });

  newImageUrl = output<string>();
  newImageFile = output<File>();

  newImageByUrl() {
    const url = this.imageForm.value.url;

    if (this.imageForm.valid && url) {
      this.newImageUrl.emit(url);
      this.imageForm.reset();
    }
  }

  uploadImage(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      this.newImageFile.emit(file);
    }
  }
}
