import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, fromEvent, tap } from 'rxjs';

interface HotkeysOptions {
  trigger?: 'keydown' | 'keyup';
  element?: HTMLElement;
  preventDefault?: boolean;
  key: string;
}

@Injectable()
export class HotkeysService {
  private destroyRef = inject(DestroyRef);
  private defaultOptions = {
    trigger: 'keydown',
    element: document.body,
    preventDefault: true,
  };

  public listen(options: HotkeysOptions) {
    const { trigger, element, preventDefault, key } = {
      ...this.defaultOptions,
      ...options,
    };

    return fromEvent<KeyboardEvent>(element, trigger).pipe(
      filter((event: KeyboardEvent) => event.key === key),
      tap((event: KeyboardEvent) => {
        if (preventDefault) {
          event.preventDefault();
        }
      }),
      takeUntilDestroyed(this.destroyRef),
    );
  }
}
