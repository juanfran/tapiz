import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef } from '@angular/material/dialog';
import { input } from '@angular/core';

@Component({
  selector: 'team-up-modal-header',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],

  template: `
    <h1 class="title()">
      {{ title() }}

      <button
        type="button"
        (click)="cancel()">
        <mat-icon>close</mat-icon>
      </button>
    </h1>
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
