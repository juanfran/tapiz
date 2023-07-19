import { Observable, defer, finalize, tap } from 'rxjs';

export function finalizeWithValue<T>(callback: (value: T) => void) {
  return (source: Observable<T>) =>
    defer(() => {
      let lastValue: T;
      return source.pipe(
        tap((value) => (lastValue = value)),
        finalize(() => callback(lastValue))
      );
    });
}
