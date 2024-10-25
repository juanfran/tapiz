import { Directive, computed } from '@angular/core';
import { contrast } from '@tapiz/cdk/utils/colors';
import { input } from '@angular/core';

const colors = [
  '#FF7F7F',
  '#7FAAFF',
  '#FFFF7F',
  '#7FFF7F',
  '#FFBF7F',
  '#BF7FBF',
  '#7FBFBF',
  '#FF7FAA',
  '#FFAA7F',
  '#AABF7F',
  '#BF7F7F',
  '#7F7FAA',
  '#BFBFAA',
  '#FFAAFF',
  '#AA7F7F',
  '#AAFFBF',
  '#7FAABF',
  '#FFBFBE',
] as const;

export const BoardColors = colors.map((backgroundColor) => {
  const color =
    contrast(backgroundColor, '#ffffff') > 2 ? '#ffffff' : '#000000';

  return {
    backgroundColor,
    color,
  };
});

@Directive({
  selector: '[tapizBoardIdToColor]',
  standalone: true,
  exportAs: 'tapizBoardIdToColor',
  host: {
    '[style.backgroundColor]': 'backgroundColor()',
    '[style.color]': 'color()',
  },
})
export class BoardIdToColorDirective {
  tapizBoardIdToColor = input.required<string>();

  #index = computed(() => {
    const id = this.tapizBoardIdToColor();

    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = hash * 31 + id.charCodeAt(i);
      hash = hash % Number.MAX_SAFE_INTEGER;
    }

    return Math.abs(hash) % this.#colors.length;
  });

  #colors = BoardColors;
  color = computed(() => {
    return this.#colors[this.#index()].color;
  });
  backgroundColor = computed(() => {
    return this.#colors[this.#index()].backgroundColor;
  });
}
