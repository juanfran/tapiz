import { TuNode } from './node.model';
import { Point } from './point.model';

export interface Image {
  url: string;
  width: number;
  height: number;
  position: Point;
  rotation: number;
}

export function isImage(node: TuNode): node is TuNode<Image> {
  return node.type === 'image';
}
