import { TestBed } from '@angular/core/testing';

import {
  provideExperimentalZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TNode } from '@tapiz/board-commons';
import { vi } from 'vitest';
import { NodesActions } from './nodes-actions';
import { BoardFacade } from '../../../services/board-facade.service';

// Mock the external UUID function
vi.mock('uuid', () => ({
  v4: () => {
    return 'test-uuid';
  },
}));

describe('NodesActions', () => {
  let service: NodesActions;
  let boardFacadeStoreMock: Partial<BoardFacade>;
  let nodes = signal<TNode[]>([]);

  beforeEach(() => {
    nodes = signal([]);

    boardFacadeStoreMock = {
      nodes,
    };

    TestBed.configureTestingModule({
      providers: [
        provideExperimentalZonelessChangeDetection(),
        NodesActions,
        { provide: BoardFacade, useValue: boardFacadeStoreMock },
      ],
    });

    service = TestBed.inject(NodesActions);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('add', () => {
    it('basic add', () => {
      const result = service.add(
        'test-type',
        { some: 'content' },
        { parent: 'parent-id' },
      );

      expect(result).toEqual({
        data: {
          type: 'test-type',
          id: 'test-uuid',
          content: { some: 'content' },
        },
        op: 'add',
        parent: 'parent-id',
        position: 0,
      });
    });

    it('add with position', () => {
      const result = service.add(
        'test-type',
        { some: 'content' },
        { position: 1 },
      );

      expect(result).toEqual({
        data: {
          type: 'test-type',
          id: 'test-uuid',
          content: { some: 'content' },
        },
        op: 'add',
        position: 1,
      });
    });

    it('add at the end', () => {
      nodes.set([
        {
          id: '1',
          type: 'test-type',
          content: { some: 'content' },
        },
        {
          id: '2',
          type: 'test-type',
          content: { some: 'content' },
        },
      ]);

      const addContent = {
        some: 'content',
      };

      const result = service.add('test-type', addContent);

      expect(result).toEqual({
        data: {
          type: 'test-type',
          id: 'test-uuid',
          content: addContent,
        },
        op: 'add',
        position: 2,
      });
    });

    it('add group after panel and before note', () => {
      nodes.set([
        {
          id: '1',
          type: 'panel',
          content: {},
        },
        {
          id: '2',
          type: 'note',
          content: {},
        },
      ]);

      const addContent = {
        some: 'content',
      };

      const result = service.add('group', addContent);

      expect(result).toEqual({
        data: {
          type: 'group',
          id: 'test-uuid',
          content: addContent,
        },
        op: 'add',
        position: 1,
      });

      nodes.set([
        {
          id: '1',
          type: 'panel',
          content: {},
        },
        {
          type: 'group',
          id: '3',
          content: addContent,
        },
        {
          id: '2',
          type: 'note',
          content: {},
        },
      ]);

      // add new group after the last group
      const result2 = service.add('group', addContent);

      expect(result2).toEqual({
        data: {
          type: 'group',
          id: 'test-uuid',
          content: addContent,
        },
        op: 'add',
        position: 2,
      });
    });

    it('add panel after last panel and before group', () => {
      nodes.set([
        {
          id: '2',
          type: 'group',
          content: {},
        },
      ]);

      const addContent = {
        some: 'content',
      };

      const result = service.add('panel', addContent);

      expect(result).toEqual({
        data: {
          type: 'panel',
          id: 'test-uuid',
          content: addContent,
        },
        op: 'add',
        position: 0,
      });

      nodes.set([
        {
          id: '1',
          type: 'panel',
          content: {},
        },
        {
          id: '2',
          type: 'group',
          content: {},
        },
      ]);

      // add new panel after the last panel
      const result2 = service.add('panel', addContent);

      expect(result2).toEqual({
        data: {
          type: 'panel',
          id: 'test-uuid',
          content: addContent,
        },
        op: 'add',
        position: 1,
      });
    });
  });

  describe('patch', () => {
    it('patch with position', () => {
      const patchContent = {
        id: '1',
        type: 'test-type',
        content: { some: 'content' },
      };

      const result = service.patch(patchContent, { position: 3 });

      expect(result).toEqual({
        data: patchContent,
        op: 'patch',
        position: 3,
      });
    });

    it('change position to the end', () => {
      nodes.set([
        {
          id: '1',
          type: 'test-type',
          content: { some: 'content' },
        },
        {
          id: '2',
          type: 'test-type',
          content: { some: 'content' },
        },
      ]);

      const patchContent = {
        id: '1',
        type: 'test-type',
        content: { some: 'content' },
      };

      const result = service.patch(patchContent);

      expect(result).toEqual({
        data: patchContent,
        op: 'patch',
        position: 1,
      });
    });

    it('patch panel before note & group and after any other panel', () => {
      nodes.set([
        {
          id: '3',
          type: 'panel',
          content: {},
        },
        {
          id: '1',
          type: 'group',
          content: {},
        },
        {
          id: '2',
          type: 'note',
          content: {},
        },
      ]);

      const patchContent = {
        id: '3',
        type: 'panel',
        content: {},
      };

      const result = service.patch(patchContent);

      expect(result).toEqual({
        data: patchContent,
        op: 'patch',
        position: 0,
      });

      nodes.set([
        {
          id: '3',
          type: 'panel',
          content: {},
        },
        {
          id: '4',
          type: 'panel',
          content: {},
        },
        {
          id: '1',
          type: 'group',
          content: {},
        },
        {
          id: '2',
          type: 'note',
          content: {},
        },
      ]);

      const result2 = service.patch(patchContent);

      expect(result2).toEqual({
        data: patchContent,
        op: 'patch',
        position: 1,
      });
    });

    it('patch group before note, after panel and after any other group', () => {
      nodes.set([
        {
          id: '1',
          type: 'group',
          content: {},
        },
        {
          id: '3',
          type: 'panel',
          content: {},
        },
        {
          id: '2',
          type: 'note',
          content: {},
        },
      ]);

      const patchContent = {
        id: '1',
        type: 'group',
        content: {},
      };

      const result = service.patch(patchContent);

      expect(result).toEqual({
        data: patchContent,
        op: 'patch',
        position: 1,
      });

      nodes.set([
        {
          id: '3',
          type: 'panel',
          content: {},
        },
        {
          id: '1',
          type: 'group',
          content: {},
        },
        {
          id: '4',
          type: 'group',
          content: {},
        },
        {
          id: '2',
          type: 'note',
          content: {},
        },
      ]);

      const result2 = service.patch(patchContent);

      expect(result2).toEqual({
        data: patchContent,
        op: 'patch',
        position: 2,
      });
    });
  });

  describe('bulkPatch', () => {
    it('should sort actions based in current position', () => {
      nodes.set([
        {
          id: '1',
          type: 'note',
          content: {},
        },
        {
          id: '2',
          type: 'note',
          content: {},
        },
        {
          id: '3',
          type: 'note',
          content: {},
        },
        {
          id: '4',
          type: 'note',
          content: {},
        },
      ]);

      const nodesToPatch = [
        { node: { id: '4', type: 'node', content: {} }, options: {} },
        { node: { id: '2', type: 'node', content: {} }, options: {} },
        { node: { id: '3', type: 'node', content: {} }, options: {} },
      ];

      const result = service.bulkPatch(nodesToPatch);

      expect(result).toEqual([
        {
          data: { id: '2', type: 'node', content: {} },
          op: 'patch',
          position: 3,
        },
        {
          data: { id: '3', type: 'node', content: {} },
          op: 'patch',
          position: 3,
        },
        {
          data: { id: '4', type: 'node', content: {} },
          op: 'patch',
          position: 3,
        },
      ]);
    });
  });
});
