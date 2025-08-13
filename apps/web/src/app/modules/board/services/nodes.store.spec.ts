import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { NodesStore } from './nodes.store';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { Store } from '@ngrx/store';
import { BoardFacade } from '../../../services/board-facade.service';
import { NodesActions } from './nodes-actions';

vi.mock('@tapiz/cdk/utils/overlapping-nodes', () => ({
  overlappingNodes: (_rect: unknown, nodes: unknown[]) => nodes,
}));

vi.mock('../../../shared/node-size', () => ({
  getNodeSize: () => ({ width: 100, height: 100 }),
}));

describe('NodesStore (Layer Manipulation)', () => {
  let nodesStore: NodesStore;
  let storeDispatch: ReturnType<typeof vi.fn>;
  let allNodes: TestNode[];

  interface TestNode {
    id: string;
    type: string;
    content: { position: { x: number; y: number }; votes: unknown[] } & Record<
      string,
      unknown
    >;
  }

  const makeNode = (id: string): TestNode => ({
    id,
    type: 'note',
    content: {
      position: { x: 0, y: 0 },
      votes: [],
    },
  });

  beforeEach(() => {
    allNodes = [];
    storeDispatch = vi.fn();

    const mockStore = {
      dispatch: storeDispatch,
    };

    const mockBoardFacade = {
      nodes: () => allNodes,
    };

    const mockNodesActions = {
      bulkPatch: vi.fn((patches: any[]) => {
        return patches.map((p: any) => ({
          data: { id: p.node.id, type: p.node.type, content: p.node.content },
          op: 'patch' as const,
          position: p.options.position,
        }));
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        NodesStore,
        { provide: Store, useValue: mockStore },
        { provide: BoardFacade, useValue: mockBoardFacade },
        { provide: NodesActions, useValue: mockNodesActions },
      ],
    });

    nodesStore = TestBed.inject(NodesStore);
  });

  describe('bringForward', () => {
    it('should move each selected node ahead of next unselected node', () => {
      allNodes = [makeNode('1'), makeNode('2'), makeNode('3'), makeNode('4')];
      const selectedNodes = [allNodes[1], allNodes[2]]; // nodes 2 & 3 selected

      storeDispatch.mockClear();
      nodesStore.bringForward(selectedNodes);

      expect(storeDispatch).toHaveBeenCalledTimes(2);

      const firstAction = storeDispatch.mock.calls[0][0];
      const secondAction = storeDispatch.mock.calls[1][0];

      expect(firstAction.actions[0].data.id).toBe('2');
      expect(firstAction.actions[0].position).toBe(3);
      expect(secondAction.actions[0].data.id).toBe('3');
      expect(secondAction.actions[0].position).toBe(3);
    });
  });

  describe('sendBackward', () => {
    it('should move each selected node behind previous unselected node', () => {
      allNodes = [makeNode('1'), makeNode('2'), makeNode('3'), makeNode('4')];
      const selectedNodes = [allNodes[1], allNodes[2]]; // nodes 2 & 3 selected

      storeDispatch.mockClear();
      nodesStore.sendBackward(selectedNodes);

      expect(storeDispatch).toHaveBeenCalledTimes(2);

      const firstAction = storeDispatch.mock.calls[0][0];
      const secondAction = storeDispatch.mock.calls[1][0];

      expect(firstAction.actions[0].data.id).toBe('3');
      expect(firstAction.actions[0].position).toBe(0);
      expect(secondAction.actions[0].data.id).toBe('2');
      expect(secondAction.actions[0].position).toBe(0);
    });
  });
});
