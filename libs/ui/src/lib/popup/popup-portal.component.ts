import { Component } from '@angular/core';
import { PortalModule } from '@angular/cdk/portal';
import { popupState } from './popup.state';

@Component({
  selector: 'tapiz-popup-portal',
  template: '<ng-template [cdkPortalOutlet]="selectedPortal()"></ng-template>',
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
  standalone: true,
  imports: [PortalModule],
})
export class PopupPortalComponent {
  selectedPortal = popupState.portal;
}
