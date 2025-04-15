import { Signal } from '@angular/core';
import { Point, TuNode } from '@tapiz/board-commons';

export interface DynamicComponent {
  preventDelete?: () => boolean;
  position?: Point;
  node: Signal<TuNode>;
  pasted: Signal<boolean>;
  focus: Signal<boolean>;
  zIndex?: number;
}
