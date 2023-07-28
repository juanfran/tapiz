import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { ResizableDirective } from '../../directives/resize.directive';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'team-up-resize-handler',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      #topLeft
      class="no-drag resize-point top-left"></div>
    <div
      #topRight
      class="no-drag resize-point top-right"></div>
    <div
      #bottomLeft
      class="no-drag resize-point bottom-left"></div>
    <div
      #bottomRight
      class="no-drag resize-point bottom-right"></div>
  `,
  styles: [
    `
      .resize-point {
        position: absolute;
        width: 10px;
        height: 10px;
        background: #fff;
        border: 1px solid #000;
        cursor: nwse-resize;
        border-radius: 50%;
      }

      .top-left {
        top: -5px;
        left: -5px;
        cursor: nwse-resize;
      }

      .top-right {
        top: -5px;
        right: -5px;
        cursor: nesw-resize;
      }

      .bottom-left {
        bottom: -5px;
        left: -5px;
        cursor: nesw-resize;
      }

      .bottom-right {
        bottom: -5px;
        right: -5px;
        cursor: nwse-resize;
      }
    `,
  ],
})
export class ResizeHandlerComponent {
  private resize = inject(ResizableDirective);

  @ViewChild('topLeft') public set topLeft(el: ElementRef) {
    const nativeElement = el.nativeElement as HTMLElement;

    this.resize.setHandler(nativeElement, 'top-left');
  }

  @ViewChild('topRight') public set topRight(el: ElementRef) {
    const nativeElement = el.nativeElement as HTMLElement;

    this.resize.setHandler(nativeElement, 'top-right');
  }

  @ViewChild('bottomLeft') public set bottomLeft(el: ElementRef) {
    const nativeElement = el.nativeElement as HTMLElement;

    this.resize.setHandler(nativeElement, 'bottom-left');
  }

  @ViewChild('bottomRight') public set bottomRight(el: ElementRef) {
    const nativeElement = el.nativeElement as HTMLElement;

    this.resize.setHandler(nativeElement, 'bottom-right');
  }
}
