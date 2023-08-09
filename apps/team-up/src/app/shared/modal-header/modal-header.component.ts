import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'team-up-modal-header',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <h1 class="title">
      {{ title }}

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

  @Input({ required: true })
  public title!: string;

  public cancel() {
    this.dialogRef.close();
  }
}
