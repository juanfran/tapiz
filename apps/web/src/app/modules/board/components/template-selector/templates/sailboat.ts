import { TNode } from '@tapiz/board-commons';
import { TemplaNode } from '../template-node.model';

export function getTemplate(): TNode<TemplaNode>[] {
  return [
    {
      id: '',
      type: 'panel',
      content: {
        position: {
          x: 97.14285714285715,
          y: -5.714285714285714,
        },
        layer: 1,
        text: '<h2 style="text-align: center"></h2>',
        width: 7044.285714285715,
        height: 4245.714285714286,
        rotation: 0,
        drawing: [],
      },
    },
    {
      id: '',
      type: 'vector',
      content: {
        position: {
          x: 4611,
          y: 3084,
        },
        layer: 1,
        width: 647,
        height: 716,
        url: 'https://cocomaterial.com/media/science_anchor_ship.svg',
        rotation: -13.383661338885226,
      },
    },
    {
      id: '',
      type: 'vector',
      content: {
        position: {
          x: 895,
          y: 2868,
        },
        layer: 1,
        width: 487,
        height: 619,
        url: 'https://cocomaterial.com/media/nature_rock.svg',
        rotation: -7.858915536804857,
      },
    },
    {
      id: '',
      type: 'vector',
      content: {
        position: {
          x: 439,
          y: 2799,
        },
        layer: 1,
        width: 487,
        height: 619,
        url: 'https://cocomaterial.com/media/nature_rock.svg',
        rotation: 0,
      },
    },
    {
      id: 'f',
      type: 'vector',
      content: {
        position: {
          x: 825,
          y: 2962,
        },
        layer: 1,
        width: 367,
        height: 493,
        url: 'https://cocomaterial.com/media/nature_rock.svg',
        rotation: 8.556041852086528,
      },
    },
    {
      id: '',
      type: 'vector',
      content: {
        position: {
          x: 2528,
          y: 873,
        },
        layer: 1,
        width: 1573,
        height: 1579,
        url: 'https://cocomaterial.com/media/transportation_ship_sailboat_sailing_boat_sea.svg',
        rotation: 2.142933860304192,
      },
    },
    {
      id: '',
      type: 'vector',
      content: {
        position: {
          x: 3229,
          y: 1921,
        },
        layer: 1,
        width: 710,
        height: 744,
        url: 'https://cocomaterial.com/media/nature_wave_water_sea_Ctk18DC.svg',
        rotation: 0,
      },
    },
    {
      id: '',
      type: 'vector',
      content: {
        position: {
          x: 4364,
          y: 199,
        },
        layer: 1,
        width: 1561,
        height: 1007,
        url: 'https://cocomaterial.com/media/nature_cloud_wind_0OSB08L.svg',
        rotation: 0,
      },
    },
    {
      id: '',
      type: 'vector',
      content: {
        position: {
          x: 272,
          y: 605,
        },
        layer: 1,
        width: 1143,
        height: 1396,
        url: 'https://cocomaterial.com/media/pirate_island_vacation_holidays.svg',
        rotation: 0,
      },
    },
    {
      id: '',
      type: 'text',
      content: {
        position: {
          x: 233,
          y: -28,
        },
        layer: 1,
        text: '<h1>Island</h1><h3>Our goals and aspirations</h3>',
        width: 1411,
        height: 947,
        rotation: 0,
      },
    },
    {
      id: '',
      type: 'text',
      content: {
        position: {
          x: 1473,
          y: 2652,
        },
        layer: 1,
        text: '<h1>Rocks</h1><h3>Potential risks ahead.</h3>',
        width: 1411,
        height: 947,
        rotation: 0,
      },
    },
    {
      id: '',
      type: 'text',
      content: {
        position: {
          x: 5303,
          y: 2532,
        },
        layer: 1,
        text: '<h1>Anchor</h1><h3>What holds us back</h3>',
        width: 1411,
        height: 947,
        rotation: 0,
      },
    },
    {
      id: '',
      type: 'text',
      content: {
        position: {
          x: 5693,
          y: 722,
        },
        layer: 1,
        text: '<h1>Wind</h1><h3>What propels us forward.</h3>',
        width: 1411,
        height: 947,
        rotation: 0,
      },
    },
  ];
}
