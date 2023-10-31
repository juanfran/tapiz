import type { StateActions, TuNode } from '@team-up/board-commons';
import { syncNodeBox } from './sync-node-box';

describe('syncNodeBox', () => {
  it('should initialize with an empty state', () => {
    const box = syncNodeBox();
    expect(box.get()).toEqual([]);
  });

  it('should apply add action', () => {
    const box = syncNodeBox();
    const newNode: TuNode = { id: '1', type: 'test', content: {} };
    const actions: StateActions[] = [{ op: 'add', data: newNode }];
    box.actions(actions);
    expect(box.get()).toEqual([newNode]);
  });

  it('should apply patch action', () => {
    const box = syncNodeBox();
    const initialNode: TuNode = {
      id: '1',
      type: 'test',
      content: { title: 'title' },
    };
    box.actions([{ op: 'add', data: initialNode }]);

    const patchedNode: TuNode = {
      id: '1',
      type: 'test',
      content: { title: 'updated title' },
    };
    const actions: StateActions[] = [{ op: 'patch', data: patchedNode }];
    box.actions(actions);
    expect(box.get()).toEqual([patchedNode]);
  });

  it('should apply remove action', () => {
    const box = syncNodeBox();
    const initialNode: TuNode = { id: '1', type: 'test', content: {} };
    box.actions([{ op: 'add', data: initialNode }]);

    const actions: StateActions[] = [
      { op: 'remove', data: { id: '1', type: 'test' } },
    ];
    box.actions(actions);
    expect(box.get()).toEqual([]);
  });

  it('should undo action add', () => {
    const box = syncNodeBox();
    const newNode: TuNode = { id: '1', type: 'test', content: {} };
    box.actions([{ op: 'add', data: newNode }], true);

    box.undo();
    expect(box.get()).toEqual([]);
  });

  it('should redo action add', () => {
    const box = syncNodeBox();
    const newNode: TuNode = { id: '1', type: 'test', content: {} };
    box.actions([{ op: 'add', data: newNode }], true);
    box.undo();

    box.redo();
    expect(box.get()).toEqual([newNode]);
  });

  it('should undo action remove', () => {
    const box = syncNodeBox();
    const newNode: TuNode = {
      id: '1',
      type: 'test',
      content: { title: 'The title' },
    };
    box.actions([{ op: 'add', data: newNode }], true);

    box.actions(
      [
        {
          op: 'remove',
          data: {
            id: '1',
            type: 'test',
          },
        },
      ],
      true
    );

    box.undo();
    expect(box.get()).toEqual([newNode]);
  });

  it('should redo action remove', () => {
    const box = syncNodeBox();
    const newNode: TuNode = {
      id: '1',
      type: 'test',
      content: { title: 'The title' },
    };
    box.actions([{ op: 'add', data: newNode }], true);

    box.actions(
      [
        {
          op: 'remove',
          data: {
            id: '1',
            type: 'test',
          },
        },
      ],
      true
    );

    box.undo();
    box.redo();
    expect(box.get()).toEqual([]);
  });

  it('should undo/redo action patch', () => {
    const box = syncNodeBox();
    const newNode: TuNode = {
      id: '1',
      type: 'test',
      content: {
        title: 'The title init',
      },
    };
    box.actions([{ op: 'add', data: newNode }], true);
    box.actions(
      [
        {
          op: 'patch',
          data: {
            ...newNode,
            content: {
              ...newNode.content,
              title: 'The title updated',
            },
          },
        },
      ],
      true
    );

    box.undo();

    expect(box.get()).toEqual([
      {
        ...newNode,
        content: {
          ...newNode.content,
          title: 'The title init',
        },
      },
    ]);

    box.redo();

    expect(box.get()).toEqual([
      {
        ...newNode,
        content: {
          ...newNode.content,
          title: 'The title updated',
        },
      },
    ]);
  });

  it('should limit history based on options', () => {
    const historyLimit = 2;
    const box = syncNodeBox({ history: historyLimit });

    // Perform 3 actions
    box.actions(
      [{ op: 'add', data: { id: '1', type: 'test1', content: {} } }],
      true
    );
    box.actions(
      [{ op: 'add', data: { id: '2', type: 'test2', content: {} } }],
      true
    );
    box.actions(
      [{ op: 'add', data: { id: '3', type: 'test3', content: {} } }],
      true
    );

    // Undo twice (reaching the history limit)
    box.undo();
    box.undo();

    // Expect that we can't undo the first action due to history limit
    expect(box.get()).toEqual([{ id: '1', type: 'test1', content: {} }]);
  });

  it('should clear future history after a new action post-undo', () => {
    const box = syncNodeBox();
    const node1: TuNode = { id: '1', type: 'test1', content: {} };
    const node2: TuNode = { id: '2', type: 'test2', content: {} };

    box.actions([{ op: 'add', data: node1 }], true);
    box.actions([{ op: 'add', data: node2 }], true);
    box.undo(); // Go back to just node1

    const node3: TuNode = { id: '3', type: 'test3', content: {} };
    box.actions([{ op: 'add', data: node3 }], true);

    // After performing a new action, redo should not bring back node2
    box.redo();
    expect(box.get()).toEqual([node1, node3]);
  });
});