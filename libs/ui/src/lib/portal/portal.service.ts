import { Injectable, signal, TemplateRef, WritableSignal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PortalService {
  readonly portals: WritableSignal<Record<string, TemplateRef<HTMLElement>>> =
    signal({});

  register(name: string, tplRef: TemplateRef<HTMLElement>) {
    this.portals.update((portals) => {
      return {
        ...portals,
        [name]: tplRef,
      };
    });
  }

  unregister(name: string) {
    this.portals.update((portals) => {
      delete portals[name];
      return {
        ...portals,
      };
    });
  }
}
