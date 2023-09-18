import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
} from '@angular/core';

@Directive({
  selector: '[teamUpClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  constructor(private elementRef: ElementRef) {}

  @Output() public teamUpClickOutside = new EventEmitter<{
    event: MouseEvent;
    el: ElementRef;
  }>();

  @HostListener('document:click', ['$event', '$event.target'])
  public onClick(event: MouseEvent, targetElement?: HTMLElement): void {
    if (targetElement) {
      const clickedInside =
        this.elementRef.nativeElement.contains(targetElement);

      if (!clickedInside) {
        this.teamUpClickOutside.emit({
          event,
          el: this.elementRef,
        });
      }
    }
  }
}
