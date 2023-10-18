import { Observable, exhaustMap, map, tap, timer } from 'rxjs';

export function bufferTime<T>(
  time: number
): (source$: Observable<T>) => Observable<T[]> {
  let acc: T[] = [];

  return (source$) => {
    return source$.pipe(
      tap((it) => {
        acc.push(it);
      }),
      exhaustMap(() => {
        return timer(time);
      }),
      map(() => acc),
      tap(() => {
        acc = [];
      })
    );
  };
}
