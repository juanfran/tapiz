import { TemplatePortal } from '@angular/cdk/portal';
import { signalState } from '@ngrx/signals';

type PortalState = {
  portal: TemplatePortal<unknown> | null;
};

export const popupState = signalState<PortalState>({ portal: null });
