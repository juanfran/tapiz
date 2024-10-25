import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';

@Component({
  selector: 'tapiz-reconnection',
  template: ` <p [class]="dotClass()">
    Reconnecting<span class="dot-1">.</span><span class="dot-2">.</span
    ><span class="dot-3">.</span>
  </p>`,
  styleUrls: ['./reconnection.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReconnectionComponent {
  dots = signal(0);
  dotClass = computed(() => {
    return `dots-${this.dots()}`;
  });

  constructor() {
    setInterval(() => {
      this.dots.update((dots) => {
        if (dots === 3) {
          return 0;
        }
        return dots + 1;
      });
    }, 500);
  }
}
