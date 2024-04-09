import { Directive, ElementRef, NgZone, OnInit, inject } from '@angular/core';
import { fromEvent } from 'rxjs';
import { output } from '@angular/core';

@Directive({
  selector: '[teamUpClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective implements OnInit {
  private elementRef = inject(ElementRef);
  private ngZone = inject(NgZone);

  public teamUpClickOutside = output<{
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
