import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarRef,
} from '@angular/material/snack-bar';
import { NotificationData } from './notification.model';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'team-up-notification',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    {{ data.message }}

    <button
      type="button"
      (click)="close()">
      <mat-icon>close</mat-icon>
    </button>
  `,
  styleUrls: ['./notification.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationComponent {
  public snackBarRef = inject(MatSnackBarRef);
  public data = inject(MAT_SNACK_BAR_DATA) as NotificationData;

  public close() {
    this.snackBarRef.dismiss();
  }
}
