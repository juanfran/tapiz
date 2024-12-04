import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Store } from '@ngrx/store';
import { BoardActions } from '../../actions/board.actions';
import { NodeAdd, TuNode } from '@tapiz/board-commons';
import { pageFeature } from '../../reducers/page.reducer';
import { TemplaNode } from './template-node.model';
import { NodesActions } from '@tapiz/nodes/services/nodes-actions';

interface Template {
  title: string;
  image: string;
  width: number;
  height: number;
  load: () => Promise<{ getTemplate: () => TuNode<TemplaNode>[] }>;
}

@Component({
  selector: 'tapiz-template-selector',
  imports: [NgOptimizedImage],
  template: `<div class="templates">
    @for (template of elements; track template.title) {
      <button
        class="template"
        type="text"
        (click)="create(template)">
        <img
          [ngSrc]="template.image"
          [width]="template.width"
          [height]="template.height" />
        <p>{{ template.title }}</p>
      </button>
    }
  </div>`,
  styleUrl: './template-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateSelectorComponent {
  #store = inject(Store);
  #nodesActions = inject(NodesActions);

  selected = output();

  boardMode = this.#store.selectSignal(pageFeature.selectBoardMode);
  userPostion = this.#store.selectSignal(pageFeature.selectPosition);
  userZoom = this.#store.selectSignal(pageFeature.selectZoom);

  elements: Template[] = [
    {
      title: 'Stop, Start, Continue',
      image: 'assets/templates/stop-start-continue.webp',
      width: 300,
      height: 142,
      load: () => {
        return import('./templates/stop-start-continue');
      },
    },
    {
      title: 'Sailboat',
      image: 'assets/templates/sailboat.webp',
      width: 300,
      height: 183,
      load: () => {
        return import('./templates/sailboat');
      },
    },
    {
      title: 'Mad, Sad, Glad',
      image: 'assets/templates/mad-sad-glad.webp',
      width: 300,
      height: 204,
      load: () => {
        return import('./templates/mad-sad-glad');
      },
    },
    {
      title: 'Starfish',
      image: 'assets/templates/starfish.webp',
      width: 300,
      height: 244,
      load: () => {
        return import('./templates/starfish');
      },
    },
  ];

  getSize(nodes: TuNode<TemplaNode>[]) {
    const sortedX = nodes.toSorted((prev, curr) => {
      return prev.content.position.x - curr.content.position.x;
    });

    const first = sortedX.at(0);
    const last = sortedX.at(-1);

    if (!first || !last) {
      return { width: 0, height: 0 };
    }

    const width = last.content.width ?? 0;

    const orderByHeight = nodes.toSorted((prev, curr) => {
      const prevHeight = prev.content.height ?? 0;
      const currHeight = curr.content.height ?? 0;

      return currHeight - prevHeight;
    });

    const taller = orderByHeight.at(0)?.content.height ?? 0;

    return {
      width: first.content.position.x + last.content.position.x + width,
      height: taller,
    };
  }

  async create(template: Template) {
    const headerHeight = 42;

    const userX = -(this.userPostion().x / this.userZoom());
    const userY = -(this.userPostion().y / this.userZoom());

    const templateNodes = (await template.load()).getTemplate();

    const documentSize = document.body.getBoundingClientRect();

    const documentWidth = documentSize.width;
    const documentHeight = documentSize.height - headerHeight;

    const templateSize = this.getSize(templateNodes);

    const templateSizeX = templateSize.width * this.userZoom();
    const templateSizeY = templateSize.height * this.userZoom();

    const widthTemplate =
      -(templateSizeX / 2 - documentWidth / 2) / this.userZoom();
    const heightTemplate =
      -(templateSizeY / 2 - documentHeight / 2) / this.userZoom();

    const parsedTemplateNodes: TuNode<TemplaNode>[] = templateNodes.map(
      (node) => {
        return {
          ...node,
          content: {
            ...node.content,
            position: {
              x: widthTemplate + userX + node.content.position.x,
              y: heightTemplate + userY + node.content.position.y,
            },
          },
        };
      },
    );

    const actions: NodeAdd[] = parsedTemplateNodes.map((node) => {
      return this.#nodesActions.add(node.type, node.content);
    });

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions,
      }),
    );

    this.selected.emit();
  }
}
