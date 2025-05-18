import { TNode } from '@tapiz/board-commons';
import { TemplaNode } from '../template-node.model';

export function getTemplate(): TNode<TemplaNode>[] {
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
        text: '<h3>🚫 Stop</h3><p><span style="color: rgb(173, 181, 189)">Cease actions hindering our progress.</span></p>',
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
        text: '<h3>✨ Start</h3><p><span style="color: #adb5bd">Implement new ideas for better outcomes.</span></p>',
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
        text: '<h3>🔄 Continue</h3><p><span style="color: #adb5bd">Keep up the good work and practices.</span></p>',
        width: 1250,
        height: 2600,
        rotation: 0,
        drawing: [],
      },
    },
    {
      id: '',
      type: 'vector',
      content: {
        position: {
          x: 4440,
          y: 902,
        },
        layer: 1,
        width: 385,
        height: 536,
        url: 'https://cocomaterial.com/media/arrow_1.svg',
        rotation: 90,
      },
    },
    {
      id: '',
      type: 'panel',
      content: {
        position: {
          x: 4500,
          y: 50,
        },
        layer: 1,
        text: '<h3>📝 Actions</h3><p><span style="color: #adb5bd">Define clear next steps.</span></p>',
        width: 1250,
        height: 2600,
        rotation: 0,
        drawing: [],
      },
    },
  ];
}
