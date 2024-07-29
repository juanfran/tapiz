import type { StateActions, TuNode } from '@tapiz/board-commons';
import { syncNodeBox } from './sync-node-box.js';

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

  it('add the same node twice', () => {
    const box = syncNodeBox();
    const newNode: TuNode = { id: '1', type: 'test', content: {} };
    const actions: StateActions[] = [{ op: 'add', data: newNode }];

    const newNode2: TuNode = { id: '1', type: 'test2', content: {} };
    const actions2: StateActions[] = [{ op: 'add', data: newNode2 }];
    box.actions(actions);
    box.actions(actions2);

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
      true,
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
      true,
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
      true,
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
      true,
    );
    box.actions(
      [{ op: 'add', data: { id: '2', type: 'test2', content: {} } }],
      true,
    );
    box.actions(
      [{ op: 'add', data: { id: '3', type: 'test3', content: {} } }],
      true,
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

  it('actions with parent', () => {
    const box = syncNodeBox();

    const children = [
      { id: '3', type: 'test3', content: { title: 'content children 1' } },
      { id: '4', type: 'test4', content: { title: 'content children 2' } },
    ];

    box.update(() => {
      return [
        { id: '1', type: 'test5', content: {} },
        { id: '2', type: 'test6', content: {}, children: children },
      ];
    });

    const addNode: TuNode = { id: 'new-1', type: 'test3', content: {} };
    const patchNode: TuNode = {
      ...children[1],
      content: {
        title: 'content children 2 update',
      },
    };

    box.actions(
      [
        {
          op: 'add',
          data: addNode,
          parent: '2',
        },
        {
          op: 'patch',
          data: patchNode,
          parent: '2',
        },
      ],
      true,
    );

    let content = box.get();

    expect(content[1].children).toEqual([children[0], patchNode, addNode]);

    box.undo();

    content = box.get();

    expect(content[1].children).toEqual(children);

    box.redo();

    content = box.get();

    expect(content[1].children).toEqual([children[0], patchNode, addNode]);
  });

  describe('change position', () => {
    let box = syncNodeBox();
    const node1: TuNode = { id: '1', type: 'note', content: {} };
    const node2: TuNode = { id: '2', type: 'note', content: {} };
    const node3: TuNode = { id: '3', type: 'group', content: {} };
    const node4: TuNode = { id: '4', type: 'panel', content: {} };
    const node5: TuNode = { id: '5', type: 'panel', content: {} };

    beforeEach(() => {
      box = syncNodeBox();
      box.actions([{ op: 'add', data: node4 }], true);
      box.actions([{ op: 'add', data: node5 }], true);
      box.actions([{ op: 'add', data: node3 }], true);
      box.actions([{ op: 'add', data: node2 }], true);
      box.actions([{ op: 'add', data: node1 }], true);
    });

    it('add preserve order', () => {
      expect(box.get()).toEqual([node4, node5, node3, node2, node1]);
    });

    it('add specific position and undo/redo', () => {
      const node6: TuNode = { id: '6', type: 'note', content: {} };
      box.actions([{ op: 'add', data: node6, position: 2 }], true);
      expect(box.get()).toEqual([node4, node5, node6, node3, node2, node1]);

      box.undo();

      expect(box.get()).toEqual([node4, node5, node3, node2, node1]);

      box.redo();

      expect(box.get()).toEqual([node4, node5, node6, node3, node2, node1]);
    });

    it('remove preserve position and undo/redo', () => {
      box.actions([{ op: 'remove', data: { id: '3', type: 'group' } }], true);
      expect(box.get()).toEqual([node4, node5, node2, node1]);

      box.undo();

      expect(box.get()).toEqual([node4, node5, node3, node2, node1]);

      box.redo();

      expect(box.get()).toEqual([node4, node5, node2, node1]);
    });

    it('patch preserve position and undo/redo', () => {
      box.actions([{ op: 'patch', data: node2, position: 0 }], true);
      expect(box.get()).toEqual([node2, node4, node5, node3, node1]);

      box.undo();

      expect(box.get()).toEqual([node4, node5, node3, node2, node1]);

      box.redo();

      expect(box.get()).toEqual([node2, node4, node5, node3, node1]);
    });

    it('same position', () => {
      box.actions([{ op: 'patch', data: node2, position: 3 }], true);
      expect(box.get()).toEqual([node4, node5, node3, node2, node1]);
    });

    it('invalid position', () => {
      const node6: TuNode = { id: '6', type: 'note', content: {} };

      box.actions([{ op: 'add', data: node6, position: 100 }], true);
      expect(box.get()).toEqual([node4, node5, node3, node2, node1, node6]);

      box.actions([{ op: 'patch', data: node4, position: 100 }], true);
      expect(box.get()).toEqual([node4, node5, node3, node2, node1, node6]);

      box.actions([{ op: 'patch', data: node4, position: -1 }], true);
      expect(box.get()).toEqual([node4, node5, node3, node2, node1, node6]);
    });
  });
});
