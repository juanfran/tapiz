export function isBoardWheelTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest('[board-noscroll]')) {
    return false;
  }

  return (
    target.tagName.toUpperCase() === 'TAPIZ-BOARD' ||
    !!target.closest('.work-layer') ||
    !!target.closest('tapiz-nodes') ||
    !!target.closest('tapiz-arrows-wrapper') ||
    !!target.closest('tapiz-board-editor-portal')
  );
}

const DOM_DELTA_PIXEL = 0;
const MOUSE_WHEEL_STEP = 120;

const MOUSE_WHEEL_MIN_STEP = 40;

export function isLikelyTrackpadPinchEvent(event: WheelEvent) {
  if (!event.ctrlKey || event.deltaMode !== DOM_DELTA_PIXEL) {
    return false;
  }

  const wheelDelta =
    (event as WheelEvent & { wheelDelta?: number }).wheelDelta ?? 0;

  // A physical wheel keeps its discrete 120-step legacy delta even when Ctrl
  // is pressed. Native trackpad pinch deltas are continuous and must not be
  // classified by magnitude because a fast pinch can produce a large deltaY.
  return wheelDelta === 0 || Math.abs(wheelDelta) % MOUSE_WHEEL_STEP !== 0;
}

export function isLikelyMouseWheelEvent(event: WheelEvent) {
  if (event.deltaMode !== DOM_DELTA_PIXEL) {
    return true;
  }

  // No horizontal movement is a prerequisite for a wheel; trackpads leak deltaX.
  if (event.deltaX !== 0) {
    return false;
  }

  const wheelDelta =
    (event as WheelEvent & { wheelDelta?: number }).wheelDelta ?? 0;

  if (wheelDelta !== 0 && Math.abs(wheelDelta) % MOUSE_WHEEL_STEP === 0) {
    return true;
  }

  // Browsers report mouse wheels in pixel mode with a sizeable vertical delta,
  // sometimes scaled by the OS display factor (e.g. a 120 step arriving as
  // 133.33) so it is not a clean multiple of MOUSE_WHEEL_STEP. Treat a large
  // vertical-only step as a wheel so a mouse is not mistaken for a trackpad
  // before detection settles.
  return Math.abs(event.deltaY) >= MOUSE_WHEEL_MIN_STEP;
}
