import { describe, expect, it } from 'vitest';
import type { Group, Note, Panel, TuNode } from '@tapiz/board-commons';
import { buildTopVotedItems, cleanNodeText, sumVotes } from './top-voted.utils';

describe('top-voted utils', () => {
  it('sums votes using the board vote semantics', () => {
    expect(sumVotes([{ vote: 2 }, { vote: -1 }, { vote: 3 }])).toBe(4);
  });

  it('sorts visible notes and groups by vote count', () => {
    const nodes: TuNode[] = [
      note('note-low', 10, 10, 'user-1', '<p>Low</p>', 2),
      group('group-high', 20, 20, 'High group', 5),
      note('note-hidden', 30, 30, 'user-2', '<p>Hidden</p>', 10),
    ];

    expect(
      buildTopVotedItems(nodes, {
        visibleNoteOwnerIds: new Set(['user-1']),
      }),
    ).toEqual([
      {
        id: 'group-high',
        type: 'group',
        title: 'High group',
        votes: 5,
        containedItems: 1,
      },
      {
        id: 'note-low',
        type: 'note',
        title: 'Low',
        votes: 2,
        containedItems: 1,
      },
    ]);
  });

  it('adds panel aggregate entries for voted items inside the panel', () => {
    const nodes: TuNode[] = [
      panel('panel-1', 0, 0, 500, 500, '<p>Keep</p>'),
      note('note-1', 20, 20, 'user-1', '<p>Inside</p>', 3),
      group('group-1', 1000, 1000, 'Outside', 4),
    ];

    expect(
      buildTopVotedItems(nodes, {
        visibleNoteOwnerIds: new Set(['user-1']),
      }),
    ).toContainEqual({
      id: 'panel-1',
      type: 'panel',
      title: 'Keep',
      votes: 3,
      containedItems: 1,
    });
  });

  it('cleans html text for compact result labels', () => {
    expect(cleanNodeText('<p>Customer&nbsp;&amp;&nbsp;team</p>')).toBe(
      'Customer & team',
    );
  });
});

function note(
  id: string,
  x: number,
  y: number,
  ownerId: string,
  text: string,
  vote: number,
): TuNode<Note, 'note'> {
  return {
    id,
    type: 'note',
    content: {
      text,
      position: { x, y },
      layer: 0,
      ownerId,
      votes: [{ userId: 'voter', vote }],
      emojis: [],
      drawing: [],
      width: 200,
      height: 100,
    },
  };
}

function group(
  id: string,
  x: number,
  y: number,
  title: string,
  vote: number,
): TuNode<Group, 'group'> {
  return {
    id,
    type: 'group',
    content: {
      title,
      position: { x, y },
      layer: 0,
      width: 200,
      height: 100,
      votes: [{ userId: 'voter', vote }],
    },
  };
}

function panel(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
): TuNode<Panel, 'panel'> {
  return {
    id,
    type: 'panel',
    content: {
      text,
      position: { x, y },
      layer: 0,
      width,
      height,
      rotation: 0,
      drawing: [],
    },
  };
}
