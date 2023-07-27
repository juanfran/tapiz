import { Directive, ElementRef, Input, inject } from '@angular/core';
import { contrast } from '../modules/board/components/note/contrast';

@Directive({
  selector: '[tuBoardIdToColor]',
  standalone: true,
})
export class BoardIdToColorDirective {
  private elementRef = inject(ElementRef<HTMLElement>);

  @Input({ required: true }) set tuBoardIdToColor(boardId: string) {
    this.uuidToColor(boardId);
  }

  private colors = [
    '#FF7F7F',
    '#7FAAFF',
    '#FFFF7F',
    '#7FFF7F',
    '#FFBF7F',
    '#BF7FBF',
  ];

  public uuidToColor(uuid: string) {
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      hash = hash * 31 + uuid.charCodeAt(i);
      hash = hash % Number.MAX_SAFE_INTEGER; // Para evitar desbordamientos
    }

    // Uso del módulo para obtener una distribución equitativa
    const index = Math.abs(hash) % this.colors.length;

    this.elementRef.nativeElement.style.backgroundColor = this.colors[index];

    if (contrast(this.colors[index], '#ffffff') > 2) {
      this.elementRef.nativeElement.style.color = '#ffffff';
    } else {
      this.elementRef.nativeElement.style.color = '#000000';
    }
  }
}
