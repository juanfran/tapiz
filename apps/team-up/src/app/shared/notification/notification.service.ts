import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationComponent } from './notification.component';
import { NotificationData } from './notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  #snackBar = inject(MatSnackBar);

  open(data: NotificationData) {
    this.#snackBar.openFromComponent(NotificationComponent, {
      data: {
        message: data.message,
        action: data.action,
      },
      panelClass: data.type,
      duration: data.action ? data.durantion : 0,
    });
  }
}
