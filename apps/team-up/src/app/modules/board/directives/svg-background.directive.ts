import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostBinding,
  Input,
} from '@angular/core';

@Directive({
  selector: '[tuSvgBackground]',
  standalone: true,
})
export class SvgBackgroundDirective {
  @Input()
  public set tuSvgBackground(svg: string) {
    this.svg64 = window.btoa(svg);
  }

  @HostBinding('style.backgroundImage')
  public get backgroundImage() {
    return `url('data:image/svg+xml;base64,${this.svg64}')`;
  }

  public svg64 = '';
}
