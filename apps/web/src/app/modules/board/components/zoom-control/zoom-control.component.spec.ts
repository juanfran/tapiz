import { describe, expect, it } from 'vitest';
import { isZoomInShortcut, isZoomOutShortcut } from './zoom-control.component';

describe('zoom control shortcuts', () => {
  it('recognizes + as zoom in', () => {
    const event = new KeyboardEvent('keydown', {
      key: '+',
      code: 'Equal',
      shiftKey: true,
    });

    expect(isZoomInShortcut(event)).toBe(true);
    expect(isZoomOutShortcut(event)).toBe(false);
  });

  it('recognizes - as zoom out', () => {
    const event = new KeyboardEvent('keydown', {
      key: '-',
      code: 'Minus',
    });

    expect(isZoomOutShortcut(event)).toBe(true);
    expect(isZoomInShortcut(event)).toBe(false);
  });

  it('recognizes repeated zoom shortcut events', () => {
    const event = new KeyboardEvent('keydown', {
      key: '+',
      code: 'Equal',
      shiftKey: true,
      repeat: true,
    });

    expect(isZoomInShortcut(event)).toBe(true);
  });

  it('ignores zoom shortcuts while typing in an input', () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();

    const event = new KeyboardEvent('keydown', {
      key: '+',
      code: 'Equal',
      shiftKey: true,
    });

    expect(isZoomInShortcut(event)).toBe(false);

    input.remove();
  });

  it('leaves browser zoom shortcuts untouched', () => {
    const controlEvent = new KeyboardEvent('keydown', {
      key: '+',
      code: 'Equal',
      shiftKey: true,
      ctrlKey: true,
    });
    const metaEvent = new KeyboardEvent('keydown', {
      key: '-',
      code: 'Minus',
      metaKey: true,
    });

    expect(isZoomInShortcut(controlEvent)).toBe(false);
    expect(isZoomOutShortcut(metaEvent)).toBe(false);
  });

  it('does not treat an unshifted equals key as zoom in', () => {
    const event = new KeyboardEvent('keydown', {
      key: '=',
      code: 'Equal',
    });

    expect(isZoomInShortcut(event)).toBe(false);
  });

  it('recognizes numpad zoom shortcuts', () => {
    const addEvent = new KeyboardEvent('keydown', {
      key: 'Add',
      code: 'NumpadAdd',
    });
    const subtractEvent = new KeyboardEvent('keydown', {
      key: 'Subtract',
      code: 'NumpadSubtract',
    });

    expect(isZoomInShortcut(addEvent)).toBe(true);
    expect(isZoomOutShortcut(subtractEvent)).toBe(true);
  });
});
