import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { BoardFacade } from '../../../../services/board-facade.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Point, StateActions, TuNode } from '@tapiz/board-commons';
import { BoardActions } from '../../actions/board.actions';
import { NodesActions } from '../../services/nodes-actions';
import { getNodeSize } from '../../../../shared/node-size';

@Component({
  selector: 'tapiz-board-nodes-align',
  imports: [MatIconModule, MatButtonModule],
  template: `
    @if (focusNodesIds().length > 1) {
      <div class="wrapper">
        <button
          (click)="alignTop()"
          mat-icon-button
          aria-label="Align top">
          <mat-icon>vertical_align_top</mat-icon>
        </button>

        <button
          (click)="alignCenter()"
          mat-icon-button
          aria-label="Align center">
          <mat-icon>vertical_align_center</mat-icon>
        </button>

        <button
          (click)="alignBottom()"
          mat-icon-button
          aria-label="Align bottom">
          <mat-icon>vertical_align_bottom</mat-icon>
        </button>

        <button
          class="align-left"
          (click)="alignLeft()"
          mat-icon-button
          aria-label="Align left">
          <mat-icon>vertical_align_bottom</mat-icon>
        </button>

        <button
          class="align-center"
          (click)="alignVerticalCenter()"
          mat-icon-button
          aria-label="Align center">
          <mat-icon>vertical_align_center</mat-icon>
        </button>

        <button
          class="align-right"
          (click)="alignRight()"
          mat-icon-button
          aria-label="Align right">
          <mat-icon>vertical_align_bottom</mat-icon>
        </button>
      </div>
    }
  `,
  styleUrl: './board-nodes-align.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardNodesAlignComponent {
  boardFacade = inject(BoardFacade);
  store = inject(Store);
  focusNodesIds = this.store.selectSignal(boardPageFeature.selectFocusId);
  #focusNodes = toSignal(this.boardFacade.selectFocusNodes$);
  #nodesActions = inject(NodesActions);

  alignBottom() {
    const nodes = this.#getNodes();

    const maxY = Math.max(
      ...nodes.map((node) => node.position.y + node.height),
    );

    const patchs: StateActions[] = [];

    nodes.forEach((node) => {
      if (node.position.y + node.height !== maxY) {
        patchs.push(
          this.#nodesActions.patch({
            type: node.type,
            id: node.id,
            content: {
              position: {
                ...node.position,
                y: maxY - node.height,
              },
            },
          }),
        );
      }
    });

    this.store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: patchs,
      }),
    );
  }

  alignVerticalCenter() {
    const nodes = this.#getNodes();

    const minX = Math.min(...nodes.map((node) => node.position.x));
    const maxX = Math.max(...nodes.map((node) => node.position.x + node.width));

    const centerX = minX + (maxX - minX) / 2;

    const patchs: StateActions[] = [];

    nodes.forEach((node) => {
      if (node.position.x + node.width / 2 !== centerX) {
        patchs.push(
          this.#nodesActions.patch({
            type: node.type,
            id: node.id,
            content: {
              position: {
                ...node.position,
                x: centerX - node.width / 2,
              },
            },
          }),
        );
      }
    });

    this.store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: patchs,
      }),
    );
  }

  alignCenter() {
    const nodes = this.#getNodes();

    const minY = Math.min(...nodes.map((node) => node.position.y));
    const maxY = Math.max(
      ...nodes.map((node) => node.position.y + node.height),
    );

    const centerY = minY + (maxY - minY) / 2;

    const patchs: StateActions[] = [];

    nodes.forEach((node) => {
      if (node.position.y + node.height / 2 !== centerY) {
        patchs.push(
          this.#nodesActions.patch({
            type: node.type,
            id: node.id,
            content: {
              position: {
                ...node.position,
                y: centerY - node.height / 2,
              },
            },
          }),
        );
      }
    });

    this.store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: patchs,
      }),
    );
  }

  alignTop() {
    const nodes = this.#getNodes();
    const minY = Math.min(...nodes.map((node) => node.position.y));

    const patchs: StateActions[] = [];

    nodes.forEach((node) => {
      if (node.position.y !== minY) {
        patchs.push(
          this.#nodesActions.patch({
            type: node.type,
            id: node.id,
            content: {
              position: {
                ...node.position,
                y: minY,
              },
            },
          }),
        );
      }
    });

    this.store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: patchs,
      }),
    );
  }

  alignLeft() {
    const nodes = this.#getNodes();
    const minX = Math.min(...nodes.map((node) => node.position.x));

    const patchs: StateActions[] = [];

    nodes.forEach((node) => {
      if (node.position.x !== minX) {
        patchs.push(
          this.#nodesActions.patch({
            type: node.type,
            id: node.id,
            content: {
              position: {
                ...node.position,
                x: minX,
              },
            },
          }),
        );
      }
    });

    this.store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: patchs,
      }),
    );
  }

  alignRight() {
    const nodes = this.#getNodes();
    const maxX = Math.max(...nodes.map((node) => node.position.x + node.width));

    const patchs: StateActions[] = [];

    nodes.forEach((node) => {
      if (node.position.x + node.width !== maxX) {
        patchs.push(
          this.#nodesActions.patch({
            type: node.type,
            id: node.id,
            content: {
              position: {
                ...node.position,
                x: maxX - node.width,
              },
            },
          }),
        );
      }
    });

    this.store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: patchs,
      }),
    );
  }

  #getNodes() {
    const nodes = this.#focusNodes() as
      | TuNode<
          {
            position: Point;
            width?: number;
            height?: number;
          },
          string
        >[]
      | undefined;

    if (!nodes) {
      return [];
    }

    return nodes.map((node) => {
      const { width, height } = getNodeSize(node);

      return {
        id: node.id,
        type: node.type,
        position: node.content.position,
        width,
        height,
      };
    });
  }
}
