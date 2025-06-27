import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { ToolbarComponent } from '@tapiz/ui/toolbar';
import { BoardTuNode, TuNode } from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { compose, rotateDEG, translate, Matrix } from 'transformation-matrix';
import { NodeToolbar } from '@tapiz/ui/toolbar/node-toolbar.model';
import type { Editor } from '@tiptap/core';

@Component({
  selector: 'tapiz-node-toolbar',
  template: `
    <tapiz-toolbar
      [editor]="editor()"
      [node]="nodeToolbar()"
      [layoutOptions]="layoutOptions()"
      [fontSize]="fontSize()"
      [defaultTextColor]="defaultTextColor()"
      [style.left.px]="toolbar().x"
      [style.top.px]="toolbar().y" />
  `,
  styleUrl: './node-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolbarComponent],
})
export class NodeToolbarComponent {
  #store = inject(Store);
  #zoom = this.#store.selectSignal(boardPageFeature.selectZoom);
  #position = this.#store.selectSignal(boardPageFeature.selectPosition);

  node = input.required<BoardTuNode>();
  editor = input.required<Editor>();
  layoutOptions = input(false);
  fontSize = input(false);
  defaultTextColor = input('#000000');
  nodeToolbar = computed(() => {
    return this.node() as TuNode<NodeToolbar>;
  });

  toolbar = computed(() => {
    const node = this.node();
    const zoom = this.#zoom();

    const position = this.#position();

    const matrix = compose(
      translate(node.content.position.x, node.content.position.y),
      rotateDEG(node.content.rotation ?? 0),
    );

    const { topLeft, topRight } = this.getPosition(
      matrix,
      node.content.width ?? 0,
      node.content.height ?? 0,
    );

    let x = topLeft.x * zoom + position.x - 300;
    const y = topLeft.y * zoom + position.y;

    if (x < 0) {
      x = topRight.x * zoom + position.x;
    }

    return {
      x,
      y,
    };
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
