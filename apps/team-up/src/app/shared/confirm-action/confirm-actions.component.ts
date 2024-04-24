import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'team-up-confirm',
  templateUrl: './confirm-actions.component.html',
  styleUrls: ['./confirm-actions.component.scss'],
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
})
export class ConfirmComponent {
  public data = inject<{
    title: string;
    description: string;
    confirm: {
      text: string;
      color: string;
    };
    cancel: {
      text: string;
      color: string;
    };
    align?: 'start' | 'center' | 'end';
  }>(MAT_DIALOG_DATA);
}
