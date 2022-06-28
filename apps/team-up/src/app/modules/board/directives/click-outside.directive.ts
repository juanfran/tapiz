import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
} from '@angular/core';

@Directive({
  selector: '[tuClickOutside]',
})
export class ClickOutsideDirective {
  constructor(private elementRef: ElementRef) {}

  @Output() public tuClickOutside = new EventEmitter<{
    event: MouseEvent;
    el: ElementRef;
  }>();

  @HostListener('document:click', ['$event', '$event.target'])
  public onClick(event: MouseEvent, targetElement?: HTMLElement): void {
    if (targetElement) {
      const clickedInside =
        this.elementRef.nativeElement.contains(targetElement);

      if (!clickedInside) {
        this.tuClickOutside.emit({
          event,
          el: this.elementRef,
        });
      }
    }
  }
}
