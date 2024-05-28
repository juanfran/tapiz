import { TuNode } from '@tapiz/board-commons';
import { TemplaNode } from '../template-node.model';

export function getTemplate(): TuNode<TemplaNode>[] {
  return [
    {
      id: '',
      type: 'panel',
      content: {
        position: {
          x: 0,
          y: 50,
        },
        layer: 1,
        text: '<h3>😠 Mad</h3><p><span style="color: rgb(173, 181, 189)">Frustrations and obstacles faced</span></p>',
        width: 1250,
        height: 2600,
        rotation: 0,
        drawing: [],
      },
    },
    {
      id: '',
      type: 'panel',
      content: {
        position: {
          x: 1300,
          y: 50,
        },
        layer: 1,
        text: '<h3>😢 Sad</h3><p><span style="color: #adb5bd">Disappointments and letdowns</span></p>',
        width: 1250,
        height: 2600,
        rotation: 0,
        drawing: [],
      },
    },
    {
      id: '',
      type: 'panel',
      content: {
        position: {
          x: 2600,
          y: 50,
        },
        layer: 1,
        text: '<h3>🎉 Glad</h3><p><span style="color: #adb5bd">Successes and happy moments</span></p>',
        width: 1250,
        height: 2600,
        rotation: 0,
        drawing: [],
      },
    },
  ];
}
