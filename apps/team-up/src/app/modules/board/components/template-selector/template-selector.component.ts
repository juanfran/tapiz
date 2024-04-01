import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Store } from '@ngrx/store';
import { BoardActions } from '../../actions/board.actions';
import { v4 } from 'uuid';
import { selectLayer } from '../../selectors/page.selectors';
import { NodeAdd, TuNode } from '@team-up/board-commons';
import { pageFeature } from '../../reducers/page.reducer';
import { TemplaNode } from './template-node.model';

interface Template {
  title: string;
  image: string;
  width: number;
  height: number;
  load: () => Promise<{ getTemplate: () => TuNode<TemplaNode>[] }>;
}

@Component({
  selector: 'team-up-template-selector',
  standalone: true,
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

  selected = output();

  layer = this.#store.selectSignal(selectLayer);
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

  constructor() {
    // reference 0, 0
    // this.#store.dispatch(
    //   BoardActions.batchNodeActions({
    //     history: true,
    //     actions: [
    //       {
    //         data: {
    //           type: 'token',
    //           id: v4(),
    //           content: {
    //             layer: this.layer(),
    //             text: 'x',
    //             color: null,
    //             backgroundColor: null,
    //             width: 100,
    //             height: 100,
    //             position: {
    //               x: 0,
    //               y: 0,
    //             },
    //           },
    //         },
    //         op: 'add',
    //       },
    //     ],
    //   }),
    // );
  }

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
          id: v4(),
        };
      },
    );

    const actions: NodeAdd[] = parsedTemplateNodes.map((node) => {
      return {
        data: node,
        op: 'add',
      };
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
