import {
  Component,
  ViewContainerRef,
  input,
  inject,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { PortalModule, TemplatePortal } from '@angular/cdk/portal';
import { PortalService } from './portal.service';

@Component({
  selector: 'tapiz-portal-target',
  standalone: true,
  imports: [PortalModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (attached(); as attached) {
      <ng-container [cdkPortalOutlet]="attached"></ng-container>
    }
  `,
})
export class PortalTargetComponent {
  #registry = inject(PortalService);
  #vcr = inject(ViewContainerRef);

  name = input.required<string>();

  attachedRef = computed(() => {
    return this.#registry.portals()[this.name()] ?? null;
  });

  attached = computed(() => {
    const portal = this.attachedRef();

    if (!portal) {
      return null;
    }

    return new TemplatePortal(portal, this.#vcr);
  });
}
