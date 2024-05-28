import { Directive, HostBinding, computed } from '@angular/core';
import { input } from '@angular/core';

@Directive({
  selector: '[tapizSvgBackground]',
  standalone: true,
})
export class SvgBackgroundDirective {
  tapizSvgBackground = input.required<string>();

  svg64 = computed(() => window.btoa(this.tapizSvgBackground()));

  @HostBinding('style.backgroundImage')
  get backgroundImage() {
    return `url('data:image/svg+xml;base64,${this.svg64}')`;
  }
}
