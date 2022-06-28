import { Component, Input } from '@angular/core';

@Component({
  selector: 'team-up-svg-icon',
  styleUrls: ['./svg-icon.component.scss'],
  template: `
    <svg>
      <use attr.xlink:href="#{{ icon }}"></use>
    </svg>
  `,
})
export class SvgIconComponent {
  @Input() public icon = '';
}
