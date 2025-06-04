import { TemplatePortal } from '@angular/cdk/portal';
import { BehaviorSubject } from 'rxjs';

type PortalState = {
  portal: TemplatePortal<unknown> | null;
};

export const popupState = new BehaviorSubject<PortalState>({
  portal: null,
});
