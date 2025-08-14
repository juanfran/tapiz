import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RxFor } from '@rx-angular/template/for';
import {
  ArrowNode,
  BoardTuNode,
  TuNode,
  isBoardTuNode,
} from '@tapiz/board-commons';
import { BoardFacade } from '../../../../../services/board-facade.service';
import { NodeComponent } from '../../node/node.component';
import { resolveArrowContent } from '../arrow-utils';

type ArrowBoardNode = TuNode<ArrowNode, 'arrow'>;

@Component({
  selector: 'tapiz-arrows-wrapper',
  template: `
    <tapiz-node
      *rxFor="let node of arrows(); trackBy: 'id'"
      [node]="node" />

    @if (tmpArrow(); as tmp) {
      <tapiz-node [node]="tmp" />
    }
  `,
  styleUrl: './arrows-wrapper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NodeComponent, RxFor],
})
export class ArrowsWrapperComponent {
  #boardFacade = inject(BoardFacade);

  arrows = computed(() => {
    const nodes = this.#boardFacade.nodes();

    return nodes.filter(isArrowBoardNode).map((node) => {
      return {
        ...node,
        content: resolveArrowContent(node.content, nodes),
      };
    });
  });

  tmpArrow = computed(() => {
    const tmp = this.#boardFacade.tmpNode();

    if (!tmp || !isArrowBoardNode(tmp)) {
      return null;
    }

    return {
      ...tmp,
      content: resolveArrowContent(tmp.content, this.#boardFacade.nodes()),
    };
  });
}

function isArrowBoardNode(node: TuNode): node is ArrowBoardNode & BoardTuNode {
  return node.type === 'arrow' && isBoardTuNode(node);
}
