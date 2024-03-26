import { TuNode } from '@team-up/board-commons';
import { TemplaNode } from '../template-node.model';

export function getTemplate(): TuNode<TemplaNode>[] {
  return [
    {
      id: '',
      type: 'vector',
      content: {
        position: {
          x: 72,
          y: 55,
        },
        layer: 1,
        width: 2716,
        height: 3167,
        url: 'https://cocomaterial.com/media/sea_starfish_1.svg',
        rotation: 0,
      },
    },
    {
      type: 'text',
      id: '',
      content: {
        text: '<h2>KEEP DOING</h2>',
        position: {
          x: 1823,
          y: 606,
        },
        layer: 1,
        width: 963,
        height: 243,
        rotation: 0,
      },
    },
    {
      type: 'vector',
      id: '',
      content: {
        url: 'https://cocomaterial.com/media/arrow_2.svg',
        width: 265,
        height: 806,
        position: {
          x: 2713,
          y: 307,
        },
        rotation: 87.79872546922398,
        layer: 1,
      },
    },
    {
      type: 'text',
      id: '',
      content: {
        text: '<h2>START DOING</h2>',
        position: {
          x: 2466,
          y: 1654,
        },
        layer: 1,
        width: 1233,
        height: 263,
        rotation: 0,
      },
    },
    {
      type: 'vector',
      id: '',
      content: {
        url: 'https://cocomaterial.com/media/arrow_2.svg',
        width: 265,
        height: 806,
        position: {
          x: 3436,
          y: 1913,
        },
        rotation: 87.79872546922398,
        layer: 1,
      },
    },
    {
      type: 'text',
      id: '',
      content: {
        text: '<h2>STOP DOING</h2>',
        position: {
          x: 1299,
          y: 2717,
        },
        layer: 1,
        width: 1233,
        height: 263,
        rotation: 0,
      },
    },
    {
      type: 'vector',
      id: '',
      content: {
        url: 'https://cocomaterial.com/media/arrow_2.svg',
        width: 265,
        height: 806,
        position: {
          x: 2195,
          y: 2968,
        },
        rotation: 87.79872546922398,
        layer: 1,
      },
    },
    {
      type: 'vector',
      id: '',
      content: {
        url: 'https://cocomaterial.com/media/arrow_2.svg',
        width: 265,
        height: 806,
        position: {
          x: 81,
          y: 2484,
        },
        rotation: 176.7173365111892,
        layer: 1,
      },
    },
    {
      type: 'text',
      id: '',
      content: {
        text: '<h2>LESS OF</h2>',
        position: {
          x: 73,
          y: 1911,
        },
        layer: 1,
        width: 731,
        height: 256,
        rotation: 0,
      },
    },
    {
      type: 'text',
      id: '',
      content: {
        text: '<h2>MORE OF</h2>',
        position: {
          x: 301,
          y: 944,
        },
        layer: 1,
        width: 731,
        height: 256,
        rotation: 0,
      },
    },
    {
      type: 'vector',
      id: '',
      content: {
        url: 'https://cocomaterial.com/media/arrow_2.svg',
        width: 265,
        height: 806,
        position: {
          x: -18,
          y: 510,
        },
        rotation: -0.7206450578579193,
        layer: 1,
      },
    },
  ];
}
