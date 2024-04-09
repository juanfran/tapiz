import { Component } from '@angular/core';
import { input } from '@angular/core';

@Component({
  selector: 'team-up-svg-icon',
  styleUrls: ['./svg-icon.component.scss'],

  template: `
    <svg>
      <use attr.xlink:href="#{{ icon() }}"></use>
    </svg>
  `,
  standalone: true,
})
export class SvgIconComponent {
  public icon = input('');
}
