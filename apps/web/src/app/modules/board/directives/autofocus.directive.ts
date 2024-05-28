import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[tapizAutofocus]',
  standalone: true,
})
export class AutoFocusDirective implements AfterViewInit {
  private el = inject(ElementRef);

  public ngAfterViewInit() {
    this.el.nativeElement.focus();
  }
}
