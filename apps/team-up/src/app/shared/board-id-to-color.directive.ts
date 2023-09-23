import { Directive, ElementRef, Input, inject } from '@angular/core';
import { contrast } from '../modules/board/components/note/contrast';

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
  selector: '[teamUpBoardIdToColor]',
  standalone: true,
  exportAs: 'teamUpBoardIdToColor',
})
export class BoardIdToColorDirective {
  private elementRef = inject(ElementRef<HTMLElement>);

  @Input({ required: true }) set teamUpBoardIdToColor(boardId: string) {
    this.idToColor(boardId);
  }

  private colors = BoardColors;

  public color = '';
  public backgroundColor = '';

  public idToColor(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = hash * 31 + id.charCodeAt(i);
      hash = hash % Number.MAX_SAFE_INTEGER;
    }

    const index = Math.abs(hash) % this.colors.length;

    this.backgroundColor = this.colors[index].backgroundColor;
    this.color = this.colors[index].color;

    this.elementRef.nativeElement.style.backgroundColor = this.backgroundColor;
    this.elementRef.nativeElement.style.color = this.color;
  }
}
