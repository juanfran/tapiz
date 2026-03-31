import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RxFor } from '@rx-angular/template/for';
import { BoardTuNode, isBoardTuNode } from '@tapiz/board-commons';
import { BoardFacade } from '../../../../../services/board-facade.service';
import { NodeComponent } from '../../node/node.component';

@Component({
  selector: 'tapiz-arrows-wrapper',
  standalone: true,
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

  arrows = computed(() =>
    this.#boardFacade
      .nodes()
      .filter(
        (node): node is BoardTuNode =>
          node.type === 'arrow' && isBoardTuNode(node),
      ),
  );

  tmpArrow = computed(() => {
    const tmp = this.#boardFacade.tmpNode();

    return tmp?.type === 'arrow' ? tmp : null;
  });
}
