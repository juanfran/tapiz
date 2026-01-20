import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { BoardFacade } from '../../../../services/board-facade.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BoardTuNode, StateActions } from '@tapiz/board-commons';
import { BoardActions } from '../../actions/board.actions';
import { NodesActions } from '../../services/nodes-actions';
import { getNodeSize } from '../../../../shared/node-size';

@Component({
  selector: 'tapiz-board-nodes-align',
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    @if (focusNodesIds().length > 1) {
      <div class="wrapper">
        <button
          (click)="alignTop()"
          mat-icon-button
          aria-label="Align top"
          matTooltip="Align top">
          <mat-icon>vertical_align_top</mat-icon>
        </button>

        <button
          (click)="alignCenter()"
          mat-icon-button
          aria-label="Align center"
          matTooltip="Align center">
          <mat-icon>vertical_align_center</mat-icon>
        </button>

        <button
          (click)="alignBottom()"
          mat-icon-button
          aria-label="Align bottom"
          matTooltip="Align bottom">
          <mat-icon>vertical_align_bottom</mat-icon>
        </button>

        <button
          class="align-left"
          (click)="alignLeft()"
          mat-icon-button
          aria-label="Align left"
          matTooltip="Align left">
          <mat-icon>vertical_align_bottom</mat-icon>
        </button>

        <button
          class="align-center"
          (click)="alignVerticalCenter()"
          mat-icon-button
          aria-label="Align center"
          matTooltip="Align vertical center">
          <mat-icon>vertical_align_center</mat-icon>
        </button>

        <button
          class="align-right"
          (click)="alignRight()"
          mat-icon-button
          aria-label="Align right"
          matTooltip="Align right">
          <mat-icon>vertical_align_bottom</mat-icon>
        </button>

        <button
          (click)="distributeHorizontalSpacing()"
          mat-icon-button
          aria-label="Distribute horizontal spacing"
          matTooltip="Distribute horizontal spacing"
          [disabled]="focusNodesIds().length < 3">
          <mat-icon>view_week</mat-icon>
        </button>

        <button
          (click)="distributeVerticalSpacing()"
          mat-icon-button
          aria-label="Distribute vertical spacing"
          matTooltip="Distribute vertical spacing"
          [disabled]="focusNodesIds().length < 3">
          <mat-icon>view_agenda</mat-icon>
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
  #focusNodes = this.boardFacade.focusNodes;
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

  /**
   * Distributes horizontal spacing evenly between selected nodes.
   * Keeps the leftmost and rightmost nodes in place and spaces the middle nodes
   * so that the gaps between all nodes are equal.
   */
  distributeHorizontalSpacing() {
    const nodes = this.#getNodes();
    // Need at least 3 nodes: two edge nodes stay fixed, middle nodes are repositioned
    if (nodes.length < 3) return;

    // Sort nodes from left to right based on their X position
    const sorted = nodes.toSorted((a, b) => a.position.x - b.position.x);

    const leftmost = sorted[0];
    const rightmost = sorted[sorted.length - 1];

    // Calculate the total distance from the left edge of leftmost to right edge of rightmost
    const totalSpan =
      rightmost.position.x + rightmost.width - leftmost.position.x;
    // Sum up all node widths
    const nodesWidth = sorted.reduce((sum, node) => sum + node.width, 0);
    // The remaining space after accounting for all node widths
    const totalSpacing = totalSpan - nodesWidth;
    // Divide the available space equally among the gaps (n-1 gaps for n nodes)
    const spacing = totalSpacing / (nodes.length - 1);

    const patchs: StateActions[] = [];
    // Start positioning from the right edge of the leftmost node plus one gap
    let currentX = leftmost.position.x + leftmost.width + spacing;

    // Only update middle nodes (skip first and last)
    for (let i = 1; i < sorted.length - 1; i++) {
      const node = sorted[i];
      if (node.position.x !== currentX) {
        patchs.push(
          this.#nodesActions.patch({
            type: node.type,
            id: node.id,
            content: {
              position: {
                ...node.position,
                x: currentX,
              },
            },
          }),
        );
      }
      // Move to next position: current node width + gap
      currentX += node.width + spacing;
    }

    this.store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: patchs,
      }),
    );
  }

  /**
   * Distributes vertical spacing evenly between selected nodes.
   * Keeps the topmost and bottommost nodes in place and spaces the middle nodes
   * so that the gaps between all nodes are equal.
   */
  distributeVerticalSpacing() {
    const nodes = this.#getNodes();
    // Need at least 3 nodes: two edge nodes stay fixed, middle nodes are repositioned
    if (nodes.length < 3) return;

    // Sort nodes from top to bottom based on their Y position
    const sorted = nodes.toSorted((a, b) => a.position.y - b.position.y);

    const topmost = sorted[0];
    const bottommost = sorted[sorted.length - 1];

    // Calculate the total distance from the top edge of topmost to bottom edge of bottommost
    const totalSpan =
      bottommost.position.y + bottommost.height - topmost.position.y;
    // Sum up all node heights
    const nodesHeight = sorted.reduce((sum, node) => sum + node.height, 0);
    // The remaining space after accounting for all node heights
    const totalSpacing = totalSpan - nodesHeight;
    // Divide the available space equally among the gaps (n-1 gaps for n nodes)
    const spacing = totalSpacing / (nodes.length - 1);

    const patchs: StateActions[] = [];
    // Start positioning from the bottom edge of the topmost node plus one gap
    let currentY = topmost.position.y + topmost.height + spacing;

    // Only update middle nodes (skip first and last)
    for (let i = 1; i < sorted.length - 1; i++) {
      const node = sorted[i];
      if (node.position.y !== currentY) {
        patchs.push(
          this.#nodesActions.patch({
            type: node.type,
            id: node.id,
            content: {
              position: {
                ...node.position,
                y: currentY,
              },
            },
          }),
        );
      }
      // Move to next position: current node height + gap
      currentY += node.height + spacing;
    }

    this.store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: patchs,
      }),
    );
  }

  #getNodes() {
    const nodes = this.#focusNodes() as BoardTuNode[] | undefined;

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
