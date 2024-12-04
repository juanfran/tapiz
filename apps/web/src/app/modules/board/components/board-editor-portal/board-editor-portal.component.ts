import { PortalModule } from '@angular/cdk/portal';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NodesStore } from '@tapiz/nodes/services/nodes.store';

@Component({
  selector: 'tapiz-board-editor-portal',
  imports: [PortalModule],
  template: `
    @if (selectedPortal(); as contentPortal) {
      <div
        class="portal"
        [style.inline-size.px]="contentPortal.node.width"
        [style.block-size.px]="contentPortal.node.height"
        [style.left.px]="contentPortal.node.position.x"
        [style.top.px]="contentPortal.node.position.y">
        <ng-template [cdkPortalOutlet]="contentPortal.portal"></ng-template>
      </div>
    }
  `,
  styleUrl: './board-editor-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardEditorPortalComponent {
  #nodesStore = inject(NodesStore);
  selectedPortal = this.#nodesStore.editorPortal;
}
