import { ApplicationRef, DestroyRef, Directive, inject } from '@angular/core';
import { Resizable, ResizePosition } from '../models/resizable.model';
import { MoveService } from '../services/move.service';
import { filterNil } from '@/app/commons/operators/filter-nil';
import { Store } from '@ngrx/store';
import { BoardActions } from '../actions/board.actions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Directive({
  selector: '[teamUpResize]',
  standalone: true,
})
export class ResizableDirective {
  private moveService = inject(MoveService);
  private store = inject(Store);
  private appRef = inject(ApplicationRef);
  private destroyRef = inject(DestroyRef);

  private host?: Resizable;

  private resizeHandler?: HTMLElement;

  public setHost(host: Resizable) {
    this.host = host;
  }

  public setHandler(
    handler: HTMLElement,
    position: ResizePosition = 'bottom-right'
  ) {
    this.resizeHandler = handler;
    this.listen(position);
  }

  public listen(position: ResizePosition) {
    if (!this.resizeHandler || !this.host) {
      return;
    }

    this.moveService
      .listenIncrementalAreaSelector(this.resizeHandler, this.host, position)
      .pipe(filterNil(), takeUntilDestroyed(this.destroyRef))
      .subscribe((size) => {
        if (this.host) {
          this.store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type: this.host.nodeType,
                    node: {
                      id: this.host.id,
                      position: {
                        x: size.x,
                        y: size.y,
                      },
                      width: size.width,
                      height: size.height,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any,
                  },
                  op: 'patch',
                },
              ],
            })
          );

          this.appRef.tick();
        }
      });
  }
}
