import {
  Directive,
  ElementRef,
  EventEmitter,
  NgZone,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { fromEvent } from 'rxjs';

@Directive({
  selector: '[teamUpClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective implements OnInit {
  private elementRef = inject(ElementRef);
  private ngZone = inject(NgZone);

  @Output() public teamUpClickOutside = new EventEmitter<{
    event: MouseEvent;
    el: ElementRef;
  }>();

  public ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      fromEvent(document, 'click').subscribe((event: Event) => {
        const targetElement = event.target as HTMLElement;

        if (targetElement) {
          const clickedInside =
            this.elementRef.nativeElement.contains(targetElement);

          if (!clickedInside) {
            this.teamUpClickOutside.emit({
              event: event as MouseEvent,
              el: this.elementRef,
            });
          }
        }
      });
    });
  }
}
