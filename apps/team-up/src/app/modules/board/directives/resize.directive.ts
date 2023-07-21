import { ApplicationRef, DestroyRef, Directive, inject } from '@angular/core';
import { Resizable } from '../models/resizable.model';
import { MoveService } from '../services/move.service';
import { filterNil } from '@/app/commons/operators/filter-nil';
import { Store } from '@ngrx/store';
import { BoardActions } from '../actions/board.actions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Directive({
  selector: '[tuResize]',
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

  public setHandler(handler: HTMLElement) {
    this.resizeHandler = handler;
    this.listen();
  }

  public listen() {
    if (!this.resizeHandler || !this.host) {
      return;
    }

    this.moveService
      .listenIncrementalAreaSelector(this.resizeHandler)
      .pipe(filterNil(), takeUntilDestroyed(this.destroyRef))
      .subscribe((size) => {
        if (this.host) {
          const { width, height } = this.host;

          this.store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type: this.host.nodeType,
                    node: {
                      id: this.host.id,
                      width: width + size.x,
                      height: height + size.y,
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
