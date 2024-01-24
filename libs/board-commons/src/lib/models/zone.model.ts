import { Point } from './point.model.js';

export interface Zone {
  position: Point;
  width: number;
  height: number;
}

export interface ZoneConfig {
  type: 'group' | 'panel';
}
