import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, fromEvent } from 'rxjs';

interface HotkeysOptions {
  trigger?: 'keydown' | 'keyup';
  element?: HTMLElement;
  key: string;
}

@Injectable()
export class HotkeysService {
  #destroyRef = inject(DestroyRef);
  #defaultOptions = {
    trigger: 'keydown',
    element: document.body,
  };

  listen(options: HotkeysOptions) {
    const { trigger, element, key } = {
      ...this.#defaultOptions,
      ...options,
    };

    return fromEvent<KeyboardEvent>(element, trigger).pipe(
      filter((event: KeyboardEvent) => event.key === key),
      takeUntilDestroyed(this.#destroyRef),
    );
  }
}
