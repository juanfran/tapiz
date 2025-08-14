import { describe, expect, it } from 'vitest';
import { ArrowNode, Point, TuNode } from '@tapiz/board-commons';
import {
  absoluteFromArrow,
  buildArrowContent,
  findAttachment,
  resolveArrowContent,
  resolveArrowEndpointTangents,
} from './arrow-utils';

describe('arrow-utils', () => {
  it('resolves attached endpoints from the current node position', () => {
    const source: TuNode = {
      id: 'source',
      type: 'note',
      content: {
        position: { x: 10, y: 20 },
        width: 100,
        height: 80,
        layer: 1,
      },
    };
    const target: TuNode = {
      id: 'target',
      type: 'note',
      content: {
        position: { x: 240, y: 120 },
        width: 100,
        height: 80,
        layer: 1,
      },
    };

    const arrow = buildArrowContent(
      {
        color: '#1c1c1c',
        strokeStyle: 'solid',
        strokeWidth: 2,
        arrowType: 'sharp',
        heads: ['end'],
        layer: 1,
      },
      {
        start: {
          anchor: { x: 110, y: 60 },
          attachment: {
            nodeId: source.id,
            offset: { x: 100, y: 40 },
          },
        },
        end: {
          anchor: { x: 240, y: 160 },
          attachment: {
            nodeId: target.id,
            offset: { x: 0, y: 40 },
          },
        },
      },
    );

    const movedSource: TuNode = {
      ...source,
      content: {
        ...source.content,
        position: { x: 50, y: 80 },
      },
    };

    const resolved = resolveArrowContent(arrow, [movedSource, target]);

    expect(absoluteFromArrow(resolved, 'start')).toEqual({ x: 150, y: 120 });
    expect(absoluteFromArrow(resolved, 'end')).toEqual({ x: 240, y: 160 });
  });

  it('falls back to the stored endpoint when an attached node is missing', () => {
    const arrow: ArrowNode = {
      layer: 1,
      position: { x: 0, y: 0 },
      width: 120,
      height: 80,
      start: { x: 10, y: 10 },
      end: { x: 100, y: 60 },
      strokeStyle: 'solid',
      arrowType: 'sharp',
      startAttachment: {
        nodeId: 'missing',
        offset: { x: 5, y: 5 },
      },
    };

    const resolved = resolveArrowContent(arrow, []);

    expect(absoluteFromArrow(resolved, 'start')).toEqual({ x: 10, y: 10 });
    expect(absoluteFromArrow(resolved, 'end')).toEqual({ x: 100, y: 60 });
  });

  it('snaps points inside a node to the nearest border', () => {
    const node: TuNode = {
      id: 'node-1',
      type: 'note',
      content: {
        position: { x: 10, y: 20 },
        width: 100,
        height: 80,
        layer: 1,
      },
    };

    const attachment = findAttachment({ x: 60, y: 95 }, [node]);

    expect(attachment.anchor).toEqual({ x: 60, y: 100 });
    expect(attachment.attachment?.offset).toEqual({ x: 50, y: 80 });
  });

  it('uses the attached node side as the curved endpoint tangent', () => {
    const source: TuNode = {
      id: 'source',
      type: 'note',
      content: {
        position: { x: 10, y: 20 },
        width: 100,
        height: 80,
        layer: 1,
      },
    };
    const arrow = buildArrowContent(
      {
        color: '#1c1c1c',
        strokeStyle: 'solid',
        strokeWidth: 2,
        arrowType: 'curved',
        heads: ['end'],
        layer: 1,
      },
      {
        start: {
          anchor: { x: 60, y: 100 },
          attachment: {
            nodeId: source.id,
            offset: { x: 50, y: 80 },
          },
        },
        end: {
          anchor: { x: 180, y: 160 },
        },
      },
    );

    expect(resolveArrowEndpointTangents(arrow, [source]).start).toEqual({
      x: 0,
      y: 1,
    });
  });

  it('resolves attached endpoints from the current rotated node position', () => {
    const source: TuNode = {
      id: 'source',
      type: 'note',
      content: {
        position: { x: 100, y: 100 },
        width: 100,
        height: 50,
        rotation: 90,
        layer: 1,
      },
    };
    const arrow: ArrowNode = {
      layer: 1,
      position: { x: 0, y: 0 },
      width: 120,
      height: 80,
      start: { x: 200, y: 125 },
      end: { x: 240, y: 125 },
      strokeStyle: 'solid',
      arrowType: 'sharp',
      startAttachment: {
        nodeId: source.id,
        offset: { x: 100, y: 25 },
      },
    };

    const resolved = resolveArrowContent(arrow, [source]);

    expectPointClose(absoluteFromArrow(resolved, 'start'), { x: 75, y: 200 });
  });

  it('snaps near a rotated node in local coordinates', () => {
    const source: TuNode = {
      id: 'source',
      type: 'note',
      content: {
        position: { x: 100, y: 100 },
        width: 100,
        height: 50,
        rotation: 90,
        layer: 1,
      },
    };

    const attachment = findAttachment({ x: 75, y: 210 }, [source]);

    expectPointClose(attachment.anchor, { x: 75, y: 200 });
    expect(attachment.attachment?.offset.x).toBeCloseTo(100);
    expect(attachment.attachment?.offset.y).toBeCloseTo(25);
  });

  it('rotates attached endpoint tangents with the node', () => {
    const source: TuNode = {
      id: 'source',
      type: 'note',
      content: {
        position: { x: 100, y: 100 },
        width: 100,
        height: 50,
        rotation: 90,
        layer: 1,
      },
    };
    const arrow = buildArrowContent(
      {
        color: '#1c1c1c',
        strokeStyle: 'solid',
        strokeWidth: 2,
        arrowType: 'curved',
        heads: ['end'],
        layer: 1,
      },
      {
        start: {
          anchor: { x: 75, y: 200 },
          attachment: {
            nodeId: source.id,
            offset: { x: 100, y: 25 },
          },
        },
        end: {
          anchor: { x: 75, y: 260 },
        },
      },
    );

    const tangent = resolveArrowEndpointTangents(arrow, [source]).start;

    expect(tangent?.x).toBeCloseTo(0);
    expect(tangent?.y).toBeCloseTo(1);
  });
});

function expectPointClose(point: { x: number; y: number }, expected: Point) {
  expect(point.x).toBeCloseTo(expected.x);
  expect(point.y).toBeCloseTo(expected.y);
}
