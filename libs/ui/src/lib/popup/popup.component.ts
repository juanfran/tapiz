import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
  TemplateRef,
  viewChild,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { computePosition, Placement } from '@floating-ui/dom';
import { popupState } from './popup.state';
import { TemplatePortal } from '@angular/cdk/portal';
@Component({
  selector: 'tapiz-popup',
  template: `
    <ng-template #popupTemplate>
      <div
        class="popup"
        #popup
        [style.left.px]="position().x"
        [style.top.px]="position().y">
        <ng-content></ng-content>
      </div>
    </ng-template>
  `,
  styleUrl: './popup.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class PopupComponent implements OnDestroy {
  @ViewChild('popupTemplate')
  set popupTemplate(templateRef: TemplateRef<unknown>) {
    const portal = new TemplatePortal(templateRef, this.#viewContainerRef);

    popupState.next({
      portal,
    });
  }
  popup = viewChild<ElementRef>('popup');
  #viewContainerRef = inject(ViewContainerRef);
  elRef = input<Element | undefined>();
  customPosition = input<{ x: number; y: number } | undefined>();
  placement = input<Placement | undefined>();
  position = signal({ x: 0, y: 0 });
  constructor() {
    effect(() => {
      const elRef = this.elRef();
      const popup = this.popup();
      if (!elRef || !popup) {
        return;
      }
      computePosition(elRef, popup.nativeElement, {
        placement: this.placement(),
      }).then(({ x, y }) => {
        this.position.set({ x, y });
      });
    });
  }
  ngOnDestroy() {
    popupState.next({
      portal: null,
    });
  }
}
