import { computed, Injectable, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { WheelInputMode, wheelInputModeValues } from '@tapiz/board-commons';
import { appFeature } from '../../../+state/app.reducer';
import { ConfigService } from '../../../services/config.service';
import { isLikelyMouseWheelEvent } from './board-wheel.utils';
import { WheelDevice, WheelDeviceDetector } from './wheel-device-detector';

const DEMO_WHEEL_INPUT_MODE_KEY = 'tapiz-demo-wheel-input-mode';

@Injectable({ providedIn: 'root' })
export class BoardWheelInputService {
  #store = inject(Store);
  #configService = inject(ConfigService);
  #user = this.#store.selectSignal(appFeature.selectUser);
  #demoMode = signal(this.#readDemoMode());
  #eventResults = new WeakMap<WheelEvent, boolean>();
  #lastMode: WheelInputMode = 'auto';
  readonly detectedDevice = signal<WheelDevice>('unknown');
  #detector = new WheelDeviceDetector({
    onChange: ({ device }) => {
      this.detectedDevice.set(device);
    },
  });
  readonly mode = computed<WheelInputMode>(() =>
    this.#configService.config.DEMO
      ? this.#demoMode()
      : this.#user()?.settings.wheelInputMode ?? 'auto',
  );

  isZoomEvent(event: WheelEvent): boolean {
    const mode = this.mode();

    this.#resetDetectorWhenModeChanges(mode);

    // A trackpad pinch arrives as a wheel event with ctrlKey set. Always treat
    // it as zoom, regardless of the selected mode, matching the usual
    // pinch-to-zoom convention.
    if (event.ctrlKey) {
      return true;
    }

    if (mode === 'mouse') {
      return true;
    }

    if (mode === 'trackpad') {
      return false;
    }

    const cachedResult = this.#eventResults.get(event);

    if (cachedResult !== undefined) {
      return cachedResult;
    }

    const result = this.#detector.handleWheel(event);

    // Prefer the detector's sticky device so a single ambiguous event mid
    // gesture cannot flip the routing (e.g. pan then zoom with the same wheel).
    const device =
      this.#detector.currentDevice !== 'unknown'
        ? this.#detector.currentDevice
        : result.device;
    const shouldZoom =
      device === 'unknown'
        ? isLikelyMouseWheelEvent(event)
        : device === 'mouse';

    this.#eventResults.set(event, shouldZoom);

    return shouldZoom;
  }

  setDemoMode(mode: WheelInputMode) {
    this.#demoMode.set(mode);
    localStorage.setItem(DEMO_WHEEL_INPUT_MODE_KEY, mode);
  }

  #readDemoMode(): WheelInputMode {
    const storedMode = localStorage.getItem(DEMO_WHEEL_INPUT_MODE_KEY);

    return wheelInputModeValues.find((mode) => mode === storedMode) ?? 'auto';
  }

  #resetDetectorWhenModeChanges(mode: WheelInputMode) {
    if (mode === this.#lastMode) {
      return;
    }

    this.#lastMode = mode;
    this.#detector.reset();
    this.detectedDevice.set('unknown');
    this.#eventResults = new WeakMap<WheelEvent, boolean>();
  }
}
