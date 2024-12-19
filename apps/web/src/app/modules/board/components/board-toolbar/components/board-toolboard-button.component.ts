import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'tapiz-board-toolbar-button',
  host: {
    '[class.active]': 'active()',
  },
  template: `
    <button
      [attr.aria-label]="label()"
      class="toolbar-button"
      (click)="clicked.emit()">
      <mat-icon [svgIcon]="icon()"></mat-icon>
    </button>
    <div class="toolbar-tooltip">{{ tooltip() }}</div>
  `,
  styleUrls: ['./board-toolbard-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule],
  providers: [],
})
export class BoardToolbardButtonComponent {
  label = input.required<string>();
  tooltip = input.required<string>();
  icon = input.required<string>();
  clicked = output();

  active = input<boolean>(false);
}
