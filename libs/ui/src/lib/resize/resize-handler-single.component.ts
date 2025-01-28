import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
} from '@angular/core';

import { MoveService } from '@tapiz/cdk/services/move.service';
import { Resizable, ResizePosition, TuNode } from '@tapiz/board-commons';
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

  public node = input.required<TuNode<Resizable>>();

  public get nodeType() {
    return this.node().type;
  }

  public get width() {
    return this.node().content.width;
  }

  public get height() {
    return this.node().content.height;
  }

  public get position() {
    return this.node().content.position;
  }

  public get rotation() {
    return this.node().content.rotation;
  }

  public get id() {
    return this.node().id;
  }

  constructor() {
    afterNextRender(() => {
      this.listen(this.el.nativeElement, 'bottom-right');
    });
  }

  public listen(handler: HTMLElement, position: ResizePosition) {
    this.moveService
      .mouseDownAndMove(handler)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mouseEvent) => {
        this.resizeService.resizeEvent.next({
          ...mouseEvent,
          position,
        } as ResizeEvent);
      });
  }
}
