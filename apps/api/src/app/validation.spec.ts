import { describe, expect, it, vi } from 'vitest';
import { StateActions } from '@tapiz/board-commons';
import { validateAction } from './validation';

describe('validateAction', () => {
  it('accepts arrow add actions', async () => {
    const action: StateActions = {
      op: 'add',
      data: {
        id: 'arrow-1',
        type: 'arrow',
        content: {
          layer: 1,
          position: { x: 90, y: 90 },
          width: 120,
          height: 80,
          start: { x: 10, y: 10 },
          end: { x: 110, y: 70 },
          color: '#1c1c1c',
          strokeStyle: 'solid',
          strokeWidth: 4,
          arrowType: 'sharp',
          heads: ['end'],
          startAttachment: {
            nodeId: 'note-1',
            offset: { x: 100, y: 40 },
          },
        },
      },
      position: 0,
    };

    await expect(
      validateAction(action, [], 'user-1', false, 'board-1', 'private-1'),
    ).resolves.toEqual(action);
  });

  it('rejects arrow stroke widths outside the allowed options', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const action: StateActions = {
      op: 'add',
      data: {
        id: 'arrow-1',
        type: 'arrow',
        content: {
          layer: 1,
          position: { x: 90, y: 90 },
          width: 120,
          height: 80,
          start: { x: 10, y: 10 },
          end: { x: 110, y: 70 },
          color: '#1c1c1c',
          strokeStyle: 'solid',
          strokeWidth: 5,
          arrowType: 'sharp',
        },
      },
      position: 0,
    };

    await expect(
      validateAction(action, [], 'user-1', false, 'board-1', 'private-1'),
    ).resolves.toBe(false);

    consoleError.mockRestore();
  });
});
