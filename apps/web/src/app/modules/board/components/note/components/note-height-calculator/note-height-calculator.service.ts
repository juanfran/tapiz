import { Injectable } from '@angular/core';

export interface NoteHeightState {
  width: number;
  height: number;
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class NoteHeightCalculatorService {
  container: HTMLElement | null = null;

  newNoteHeight(state: NoteHeightState): number {
    if (!this.container) {
      this.container = document.querySelector('tapiz-note-height-calculator');
    }

    const container = this.container;

    const minFontSize = 1;
    const maxFontSize = 56;
    let fontSize = maxFontSize;
    const increment = 1;

    if (!container) {
      return maxFontSize;
    }

    const div = document.createElement('div');
    const textDiv = document.createElement('div');
    const padding = 18;
    const nameHeight = 22;

    div.style.overflowY = 'scroll';
    div.style.width = `${state.width}px`;
    div.style.height = `${state.height - nameHeight}px`;
    div.style.padding = `${padding}px`;
    div.style.position = 'absolute';
    div.style.top = '-1000px';
    div.id = 'textDivCalculator';
    textDiv.classList.add('rich-text', 'note-rich-text');

    textDiv.innerHTML = state.text;

    div.appendChild(textDiv);

    container.appendChild(div);

    while (fontSize >= minFontSize) {
      div.style.setProperty('--text-editor-font-size', `${fontSize}px`);

      if (textDiv.clientHeight + padding / 2 < div.clientHeight) {
        break;
      }

      fontSize -= increment;
    }

    div.remove();

    if (fontSize < minFontSize) {
      return minFontSize;
    }

    return fontSize - increment;
  }
}
