import { BoardFacade } from '../../../../services/board-facade.service';
import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { ToolbarComponent } from '@tapiz/ui/toolbar';
import { BoardTuNodeFull, TuNode } from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { compose, rotateDEG, translate, Matrix } from 'transformation-matrix';
import { EditorViewSharedStateService } from '@tapiz/ui/editor-view';
import { NodeToolbar } from '@tapiz/ui/toolbar/node-toolbar.model';
import type { Editor } from '@tiptap/core';

interface Toolbar {
  id: string;
  view: Editor;
  options: {
    layoutOptions: boolean;
    fontSize: boolean;
    defaultTextColor: string;
  };
  node: Signal<TuNode<NodeToolbar, string>>;
  x: number;
  y: number;
}

@Component({
  selector: 'tapiz-node-toolbar',
  template: `
    @for (toolbar of toolbars(); track toolbar.id) {
      <tapiz-toolbar
        [editor]="toolbar.view"
        [node]="toolbar.node()"
        [layoutOptions]="toolbar.options.layoutOptions"
        [fontSize]="toolbar.options.fontSize"
        [defaultTextColor]="toolbar.options.defaultTextColor"
        [style.left.px]="toolbar.x"
        [style.top.px]="toolbar.y" />
    }
  `,
  styleUrl: './node-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolbarComponent],
})
export class NodeToolbarComponent {
  #boardFacade = inject(BoardFacade);
  #editorViewSharedStateService = inject(EditorViewSharedStateService);
  #store = inject(Store);
  #nodes = this.#boardFacade.nodes;
  #zoom = this.#store.selectSignal(boardPageFeature.selectZoom);
  #position = this.#store.selectSignal(boardPageFeature.selectPosition);
  #editorNodes = toSignal(this.#editorViewSharedStateService.getNodes$());

  toolbars = computed(() => {
    const nodes = this.#nodes();
    const zoom = this.#zoom();
    const toolbarNodes = Object.entries(this.#editorNodes() ?? []).map(
      ([id, { view, options, node }]) => {
        return { id, view, options, node };
      },
    );

    const position = this.#position();

    return toolbarNodes
      .map((toolbar) => {
        const node = nodes.find(
          (n): n is BoardTuNodeFull => n.id === toolbar.id,
        );

        if (!node) {
          return;
        }

        const matrix = compose(
          translate(node.content.position.x, node.content.position.y),
          rotateDEG(node.content.rotation ?? 0),
        );

        const { topLeft, topRight } = this.getPosition(
          matrix,
          node.content.width,
          node.content.height,
        );

        let x = topLeft.x * zoom + position.x - 300;
        const y = topLeft.y * zoom + position.y;

        if (x < 0) {
          x = topRight.x * zoom + position.x;
        }

        return {
          id: node.id,
          view: toolbar.view,
          node: toolbar.node,
          options: {
            defaultTextColor: '#000000',
            ...toolbar.options,
          },
          x,
          y,
        } satisfies Toolbar;
      })
      .filter((it): it is Toolbar => !!it);
  });

  getPosition(matrix: Matrix, width: number, height: number) {
    const topLeft = { x: matrix.e, y: matrix.f };
    const topRight = {
      x: matrix.e + matrix.a * width,
      y: matrix.f + matrix.b * width,
    };
    const bottomLeft = {
      x: matrix.e + matrix.c * height,
      y: matrix.f + matrix.d * height,
    };
    const bottomRight = {
      x: matrix.e + matrix.a * width + matrix.c * height,
      y: matrix.f + matrix.b * width + matrix.d * height,
    };

    return {
      topLeft,
      topRight,
      bottomLeft,
      bottomRight,
    };
  }

  getTopCenterPosition(matrix: Matrix, width: number, height: number) {
    const topLeft = { x: matrix.e, y: matrix.f };
    const topRight = {
      x: matrix.e + matrix.a * width,
      y: matrix.f + matrix.b * width,
    };
    const bottomLeft = {
      x: matrix.e + matrix.c * height,
      y: matrix.f + matrix.d * height,
    };
    const bottomRight = {
      x: matrix.e + matrix.a * width + matrix.c * height,
      y: matrix.f + matrix.b * width + matrix.d * height,
    };

    // Top point
    const minY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);

    // x center
    const centerX = (topLeft.x + topRight.x + bottomLeft.x + bottomRight.x) / 4;

    return { x: centerX, y: minY };
  }
}
