import { describe, it, expect } from 'vitest';
import { newNote, patchNote } from './note.validator.js';

const validNote = {
  position: { x: 0, y: 0 },
  layer: 1,
  width: 200,
  height: 200,
  text: '<p>Hello</p>',
  votes: [],
  emojis: [],
  drawing: [],
  ownerId: 'user-123',
  color: '#fef3c7',
  textHidden: false,
};

describe('note.validator', () => {
  it('akzeptiert valide Note', () => {
    const result = newNote.safeParse(validNote);
    expect(result.success).toBe(true);
  });

  it('weist Note ohne Pflichtfelder ab', () => {
    const result = newNote.safeParse({ text: 'hello' });
    expect(result.success).toBe(false);
  });

  it('begrenzt votes auf max 500', () => {
    const votes = Array.from({ length: 501 }, (_, i) => ({
      userId: `user-${i}`,
      vote: 1,
    }));

    const result = newNote.safeParse({ ...validNote, votes });
    expect(result.success).toBe(false);
  });

  it('akzeptiert 500 votes', () => {
    const votes = Array.from({ length: 500 }, (_, i) => ({
      userId: `user-${i}`,
      vote: 1,
    }));

    const result = newNote.safeParse({ ...validNote, votes });
    expect(result.success).toBe(true);
  });

  it('begrenzt emojis auf max 200', () => {
    const emojis = Array.from({ length: 201 }, () => ({
      unicode: '😀',
      position: { x: 0, y: 0 },
    }));

    const result = newNote.safeParse({ ...validNote, emojis });
    expect(result.success).toBe(false);
  });

  it('begrenzt drawing auf max 100 Strokes', () => {
    const drawing = Array.from({ length: 101 }, () => ({
      color: '#000000',
      size: 2,
      points: [{ x: 0, y: 0 }],
    }));

    const result = newNote.safeParse({ ...validNote, drawing });
    expect(result.success).toBe(false);
  });

  it('begrenzt drawing points auf max 10000', () => {
    const drawing = [
      {
        color: '#000000',
        size: 2,
        points: Array.from({ length: 10001 }, () => ({ x: 0, y: 0 })),
      },
    ];

    const result = newNote.safeParse({ ...validNote, drawing });
    expect(result.success).toBe(false);
  });

  it('patchNote akzeptiert partielle Updates', () => {
    const result = patchNote.safeParse({ text: 'updated' });
    expect(result.success).toBe(true);
  });

  it('patchNote validiert votes-Limit auch bei partiellem Update', () => {
    const votes = Array.from({ length: 501 }, (_, i) => ({
      userId: `user-${i}`,
      vote: 1,
    }));

    const result = patchNote.safeParse({ votes });
    expect(result.success).toBe(false);
  });
});
