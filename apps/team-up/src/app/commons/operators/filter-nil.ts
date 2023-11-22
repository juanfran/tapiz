import { filter } from 'rxjs/operators';

export function filterNil() {
  return filter(
    <T>(value: T): value is NonNullable<T> =>
      value !== undefined && value !== null,
  );
}
