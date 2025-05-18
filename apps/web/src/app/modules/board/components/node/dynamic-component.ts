import { Signal } from '@angular/core';
import { Point, TNode } from '@tapiz/board-commons';

export interface DynamicComponent {
  preventDelete?: () => boolean;
  position?: Point;
  node: Signal<TNode>;
  pasted: Signal<boolean>;
  focus: Signal<boolean>;
  zIndex?: number;
}
