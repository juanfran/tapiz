import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DemoIntroDialogComponent } from './demo-intro-dialog.component';

@Component({
  selector: 'tapiz-demo-intro',
  imports: [MatDialogModule],
  template: '',
  styleUrl: './demo-intro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoIntroComponent {
  #dialog = inject(MatDialog);

  constructor() {
    const hasSeenIntro = localStorage.getItem('demo-intro');

    if (hasSeenIntro) {
      return;
    }

    const dialogRef = this.#dialog.open(DemoIntroDialogComponent);

    dialogRef.afterClosed().subscribe(() => {
      localStorage.setItem('demo-intro', 'true');
    });
  }
}
