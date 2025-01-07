import { BoardFacade } from '../../../../services/board-facade.service';
import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { ToolbarComponent } from '@tapiz/ui/toolbar';
import {
  Observable,
  combineLatest,
  distinctUntilChanged,
  map,
  withLatestFrom,
} from 'rxjs';
import { Point, TuNode } from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { pageFeature } from '../../reducers/page.reducer';
import * as R from 'remeda';
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
  #nodes = this.#boardFacade.getNodes() as Observable<
    TuNode<{
      position: Point;
      rotation?: number;
      width: number;
      height: number;
    }>[]
  >;

  toolbars = toSignal(
    combineLatest([
      this.#nodes,
      this.#store.select(pageFeature.selectZoom),
      this.#editorViewSharedStateService.getNodes$(),
    ]).pipe(
      withLatestFrom(this.#store.select(pageFeature.selectPosition)),
      map(([[nodes, zoom, toolbarNodes], position]) => {
        return {
          nodes,
          zoom,
          toolbarNodes: Array.from(toolbarNodes).map(
            ([id, { view, options, node }]) => {
              return { id, view, options, node };
            },
          ),
          position,
        };
      }),
      map(({ nodes, zoom, toolbarNodes, position }) => {
        return toolbarNodes
          .map((toolbar) => {
            const node = nodes.find((n) => n.id === toolbar.id);

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
              options: toolbar.options,
              x,
              y,
            } as Toolbar;
          })
          .filter((it): it is Toolbar => !!it);
      }),
      distinctUntilChanged((prev, curr) => {
        return R.isDeepEqual(prev, curr);
      }),
    ),
  );

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
