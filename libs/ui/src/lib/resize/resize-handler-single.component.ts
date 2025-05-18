import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  output,
} from '@angular/core';

import { MoveService } from '@tapiz/cdk/services/move.service';
import { Resizable, ResizePosition, TNode } from '@tapiz/board-commons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResizeService } from './resize.service';
import { input } from '@angular/core';
import { ResizeEvent } from './resize.model';

@Component({
  selector: 'tapiz-resize-single',
  imports: [],
  template: '<ng-content></ng-content>',
  styles: `
    :host {
      bottom: 0;
      cursor: se-resize;
      height: 50px;
      position: absolute;
      right: 0;
      width: 50px;
    }
  `,
})
export class ResizeHandlerSingleComponent implements Resizable {
  private moveService = inject(MoveService);
  private destroyRef = inject(DestroyRef);
  private resizeService = inject(ResizeService);
  private el: ElementRef<HTMLElement> = inject(ElementRef);

  node = input.required<TNode<Resizable>>();
  initResize = output();

  get nodeType() {
    return this.node().type;
  }

  get width() {
    return this.node().content.width;
  }

  get height() {
    return this.node().content.height;
  }

  get position() {
    return this.node().content.position;
  }

  get rotation() {
    return this.node().content.rotation;
  }

  get id() {
    return this.node().id;
  }

  constructor() {
    afterNextRender(() => {
      this.listen(this.el.nativeElement, 'bottom-right');
    });
  }

  listen(handler: HTMLElement, position: ResizePosition) {
    this.moveService
      .mouseDownAndMove(handler)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mouseEvent) => {
        if (mouseEvent.type === 'start') {
          this.initResize.emit();
        }

        const resizeEvent: ResizeEvent = {
          ...mouseEvent,
          position,
          nodeRotation: this.node().content.rotation ?? 0,
        };

        this.resizeService.resizeEvent.next(resizeEvent);
      });
  }
}
