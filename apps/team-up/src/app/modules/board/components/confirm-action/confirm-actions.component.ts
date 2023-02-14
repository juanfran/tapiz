import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'team-up-confirm',
  templateUrl: './confirm-actions.component.html',
  styleUrls: ['./confirm-actions.component.scss'],
})
export class ConfirmComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
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
    }
  ) {}
}
