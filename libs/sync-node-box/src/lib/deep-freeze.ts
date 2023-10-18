export function deepFreeze<T>(obj: T) {
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (obj as any)[name];
    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj);
}
