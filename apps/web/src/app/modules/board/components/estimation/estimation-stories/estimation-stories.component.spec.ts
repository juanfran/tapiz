import { describe, expect, it } from 'vitest';
import source from './estimation-stories.component.ts?raw';

describe('EstimationStoriesComponent rich text editor markup', () => {
  it('keeps the rich text editor outside native labels', () => {
    expect(source).not.toMatch(
      /<label\b[^>]*>[\s\S]*?<tapiz-rich-text-editor\b[\s\S]*?<\/label>/,
    );
  });

  it('documents why label wrapping breaks the editor toolbar', () => {
    document.body.innerHTML = `
      <label>
        <span>Description</span>
        <button id="bold" type="button">Bold</button>
        <div id="editor" contenteditable="true">Description</div>
      </label>
    `;
    const events: string[] = [];

    document
      .getElementById('bold')
      ?.addEventListener('click', () => events.push('bold-click'));
    document
      .getElementById('editor')
      ?.addEventListener('click', () => events.push('editor-click'));

    document
      .getElementById('editor')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(events).toEqual(['editor-click', 'bold-click']);
  });
});
