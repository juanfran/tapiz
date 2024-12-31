import { DomPortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { BoardTuNode, Point } from '@tapiz/board-commons';
import { NodesStore } from '../services/nodes.store';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { EditorViewSharedStateService } from '@tapiz/ui/editor-view';

@Component({
  selector: 'tapiz-editor-portal',
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
  #editorViewSharedStateService = inject(EditorViewSharedStateService);
  #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  domPortalContent =
    viewChild.required<ElementRef<HTMLElement>>('domPortalContent');
  node = input.required<BoardTuNode>();

  #width = computed(() => this.node().content.width);
  #height = computed(() => this.node().content.height);
  #position = computed(() => this.node().content.position);
  #ready = signal(false);

  #zoom = this.#nodesStore.zoom;

  constructor() {
    afterNextRender(() => {
      this.#ready.set(true);
    });

    explicitEffect(
      [this.#ready, this.#width, this.#height, this.#position],
      ([ready, width, height, position]) => {
        if (!ready || !width || !height) {
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

    let portal = this.#editorViewSharedStateService.editorPortal()?.portal;
    const attached =
      this.#editorViewSharedStateService.editorPortal()?.attached || false;

    if (!portal) {
      portal = new DomPortal(this.domPortalContent());
    }

    this.#editorViewSharedStateService.editorPortal.set({
      portal,
      node: {
        width: node.width - left * 2,
        height: node.height - top * 2,
        position: {
          x: node.position.x + left,
          y: node.position.y + top,
        },
      },
      attached,
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
    this.#editorViewSharedStateService.editorPortal.set(null);
  }
}
