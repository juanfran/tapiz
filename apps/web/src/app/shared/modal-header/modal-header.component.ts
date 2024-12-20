import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef } from '@angular/material/dialog';
import { input } from '@angular/core';

@Component({
  selector: 'tapiz-modal-header',
  imports: [MatButtonModule, MatIconModule],

  template: `
    <h1 class="title()">
      {{ title() }}
    </h1>
    <button
      type="button"
      (click)="cancel()">
      <mat-icon>close</mat-icon>
    </button>
  `,
  styleUrls: ['./modal-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalHeaderComponent {
  public dialogRef = inject(MatDialogRef);

  public title = input.required<string>();

  public cancel() {
    this.dialogRef.close();
  }
}
