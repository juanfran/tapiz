import {
  Component,
  DestroyRef,
  ElementRef,
  Input,
  afterNextRender,
  inject,
} from '@angular/core';

import { MoveService } from '@team-up/cdk/services/move.service';
import { Resizable, ResizePosition, TuNode } from '@team-up/board-commons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filterNil } from 'ngxtension/filter-nil';
import { ResizeService } from './resize.service';

@Component({
  selector: 'team-up-resize-single',
  standalone: true,
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

  @Input({ required: true })
  public node!: TuNode<Resizable>;

  public get nodeType() {
    return this.node.type;
  }

  public get width() {
    return this.node.content.width;
  }

  public get height() {
    return this.node.content.height;
  }

  public get position() {
    return this.node.content.position;
  }

  public get rotation() {
    return this.node.content.rotation;
  }

  public get id() {
    return this.node.id;
  }

  constructor() {
    afterNextRender(() => {
      this.listen(this.el.nativeElement, 'bottom-right');
    });
  }

  public listen(handler: HTMLElement, position: ResizePosition) {
    const onStart = () => {
      this.resizeService.startEvent.next({
        type: this.nodeType,
        id: this.id,
        content: {
          width: this.width,
          height: this.height,
        },
      });
    };

    this.moveService
      .listenIncrementalAreaSelector(handler, this, position, onStart)
      .pipe(filterNil(), takeUntilDestroyed(this.destroyRef))
      .subscribe((size) => {
        this.resizeService.resizeEvent.next({
          type: this.nodeType,
          id: this.id,
          content: {
            position: {
              x: size.x,
              y: size.y,
            },
            width: size.width,
            height: size.height,
          },
        });
      });
  }
}
