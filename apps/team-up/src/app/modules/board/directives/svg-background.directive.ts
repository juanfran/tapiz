import { Directive, HostBinding, computed } from '@angular/core';
import { input } from '@angular/core';

@Directive({
  selector: '[teamUpSvgBackground]',
  standalone: true,
})
export class SvgBackgroundDirective {
  teamUpSvgBackground = input.required<string>();

  svg64 = computed(() => window.btoa(this.teamUpSvgBackground()));

  @HostBinding('style.backgroundImage')
  get backgroundImage() {
    return `url('data:image/svg+xml;base64,${this.svg64}')`;
  }
}
