import { CdkPortalOutlet, Portal, PortalModule } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { EditorViewSharedStateService } from '@tapiz/ui/editor-view';
import { explicitEffect } from 'ngxtension/explicit-effect';

@Component({
  selector: 'tapiz-board-editor-portal',
  imports: [PortalModule],
  template: `
    @if (selectedPortal(); as contentPortal) {
      <div
        cdkPortalOutlet
        class="portal"
        [style.inline-size.px]="contentPortal.node.width"
        [style.block-size.px]="contentPortal.node.height"
        [style.left.px]="contentPortal.node.position.x"
        [style.top.px]="contentPortal.node.position.y"></div>
    }
  `,
  styleUrl: './board-editor-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardEditorPortalComponent {
  #editorViewSharedStateService = inject(EditorViewSharedStateService);
  selectedPortal = this.#editorViewSharedStateService.editorPortal;
  hidden = signal(true);
  portalHost = viewChild('portalHost');
  thePortal: Portal<unknown> | null = null;
  cd = inject(ChangeDetectorRef);
  cdkPortalOutlet = viewChild(CdkPortalOutlet);

  constructor() {
    explicitEffect(
      [this.selectedPortal, this.cdkPortalOutlet],
      ([selectedPortal, cdkPortalOutlet]) => {
        if (!cdkPortalOutlet || !selectedPortal || selectedPortal.attached) {
          return;
        }

        cdkPortalOutlet.attach(selectedPortal.portal);
        this.#editorViewSharedStateService.editorPortal.update(
          (editorPortal) => {
            return {
              ...editorPortal,
              attached: true,
            } as typeof editorPortal;
          },
        );
      },
    );
  }
}
