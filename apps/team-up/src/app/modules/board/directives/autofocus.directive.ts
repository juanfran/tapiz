import { AfterViewInit, Directive, ElementRef } from '@angular/core';

@Directive({
  selector: '[tuAutofocus]',
  standalone: true,
})
export class AutoFocusDirective implements AfterViewInit {
  constructor(private el: ElementRef) {}

  public ngAfterViewInit() {
    this.el.nativeElement.focus();
  }
}
