import { TrackByFunction } from '@angular/core';

export const trackByProp: <T>(prop: keyof T) => TrackByFunction<T> =
  <T>(prop: keyof T) =>
  (_: number, item: T) => {
    return item[prop];
  };
