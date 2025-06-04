import { Component } from '@angular/core';
import { PortalModule } from '@angular/cdk/portal';
import { popupState } from './popup.state';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

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
  imports: [PortalModule],
})
export class PopupPortalComponent {
  selectedPortal = toSignal(
    popupState.asObservable().pipe(map((state) => state.portal)),
    { initialValue: null },
  );
}
