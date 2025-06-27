import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { PortalModule } from '@angular/cdk/portal';
import { PortalService } from './portal.service';

@Component({
  selector: 'tapiz-portal',
  standalone: true,
  imports: [PortalModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #content>
      <ng-content></ng-content>
    </ng-template>
  `,
})
export class PortalComponent implements OnDestroy {
  #portalService = inject(PortalService);

  name = input.required<string>();
  portalTpl = viewChild.required<TemplateRef<HTMLElement>>('content');

  constructor() {
    afterNextRender(() => {
      this.#portalService.register(this.name(), this.portalTpl());
    });
  }

  ngOnDestroy() {
    this.#portalService.unregister(this.name());
  }
}
