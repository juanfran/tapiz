import { Point } from './point.model';

export interface CocomaterialTag {
  name: string;
  slug: string;
  url: string;
}

export interface CocomaterialApiVector {
  coloredSvg: null | string;
  coloredSvgContent: string;
  fillColor: null | string;
  id: number;
  name: string;
  strokeColor: null | string;
  svg: string;
  svgContent: string;
  tags: string;
  url: string;
}

export interface CocomaterialApiListVectors {
  count: number;
  next: null | string;
  previous: null | string;
  results: CocomaterialApiVector[];
}

export interface Vector {
  id: string;
  url: string;
  width: number;
  height: number;
  position: Point;
}
