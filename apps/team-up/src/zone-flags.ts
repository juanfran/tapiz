// disable patching requestAnimationFrame
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).__Zone_disable_requestAnimationFrame = true;

// disable patching specified eventNames
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).__zone_symbol__UNPATCHED_EVENTS = [
  'scroll',
  'mousemove',
  'mouseover',
];
