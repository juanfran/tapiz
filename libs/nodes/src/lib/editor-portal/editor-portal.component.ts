import { DomPortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { BoardTuNode, Point } from '@tapiz/board-commons';
import { NodesStore } from '../services/nodes.store';
import { explicitEffect } from 'ngxtension/explicit-effect';

@Component({
  selector: 'tapiz-editor-portal',
  standalone: true,
  imports: [],
  template: `
    <div #domPortalContent>
      <ng-content></ng-content>
    </div>
  `,
  styleUrl: './editor-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorPortalComponent implements OnDestroy {
  #nodesStore = inject(NodesStore);
  #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  domPortalContent =
    viewChild.required<ElementRef<HTMLElement>>('domPortalContent');
  node = input.required<BoardTuNode>();

  #width = computed(() => this.node().content.width);
  #height = computed(() => this.node().content.height);
  #position = computed(() => this.node().content.position);

  #zoom = this.#nodesStore.zoom;

  constructor() {
    explicitEffect(
      [this.#width, this.#height, this.#position],
      ([width, height, position]) => {
        if (!width || !height) {
          return;
        }

        this.#refreshPortal({
          width,
          height,
          position,
        });
      },
    );
  }

  #refreshPortal(node: { width: number; height: number; position: Point }) {
    const { left, top } = this.#getDiff();

    let portal = this.#nodesStore.editorPortal()?.portal;

    if (!portal) {
      portal = new DomPortal(this.domPortalContent());
    }

    this.#nodesStore.editorPortal.set({
      portal,
      node: {
        width: node.width - left * 2,
        height: node.height - top * 2,
        position: {
          x: node.position.x + left,
          y: node.position.y + top,
        },
      },
    });
  }

  #getDiff() {
    const wrapperElm = this.#elementRef.nativeElement.closest('tapiz-node');

    if (!wrapperElm) {
      return { left: 0, top: 0 };
    }

    const position = this.#elementRef.nativeElement.getBoundingClientRect();

    return {
      left:
        (position.left - wrapperElm.getBoundingClientRect().left) /
        this.#zoom(),
      top:
        (position.top - wrapperElm.getBoundingClientRect().top) / this.#zoom(),
    };
  }

  ngOnDestroy() {
    this.#nodesStore.editorPortal.set(null);
  }
}
