import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';
import { RotateDirective } from './rotate.directive';

@Directive({
  selector: '[teamUpRotateHandler]',
  standalone: true,
})
export class RotateHandlerDirective implements AfterViewInit {
  private el = inject(ElementRef<HTMLElement>);
  private rotate = inject(RotateDirective);

  private get nativeElement() {
    return this.el.nativeElement;
  }

  public ngAfterViewInit() {
    this.rotate.setHandler(this.nativeElement);
  }
}
