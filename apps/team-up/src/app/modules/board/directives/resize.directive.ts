import { ApplicationRef, DestroyRef, Directive, inject } from '@angular/core';
import { Resizable, ResizePosition } from '../models/resizable.model';
import { MoveService } from '../services/move.service';
import { filterNil } from '@/app/commons/operators/filter-nil';
import { Store } from '@ngrx/store';
import { BoardActions } from '../actions/board.actions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BoardFacade } from '@/app/services/board-facade.service';
import { StateActions } from '@team-up/board-commons';

@Directive({
  selector: '[teamUpResize]',
  standalone: true,
})
export class ResizableDirective {
  private moveService = inject(MoveService);
  private store = inject(Store);
  private appRef = inject(ApplicationRef);
  private destroyRef = inject(DestroyRef);
  private boardFacade = inject(BoardFacade);

  private host?: Resizable;

  private resizeHandler?: HTMLElement;

  public setHost(host: Resizable) {
    this.host = host;
  }

  public setHandler(
    handler: HTMLElement,
    position: ResizePosition = 'bottom-right',
  ) {
    this.resizeHandler = handler;
    this.listen(position);
  }

  public listen(position: ResizePosition) {
    if (!this.resizeHandler || !this.host) {
      return;
    }

    const onStart = () => {
      this.boardFacade.patchHistory((history) => {
        if (this.host) {
          const nodeAction: StateActions = {
            data: {
              type: this.host.nodeType,
              id: this.host.id,
              content: {
                width: this.host.width,
                height: this.host.height,
              },
            },
            op: 'patch',
          };

          history.past.unshift([nodeAction]);
          history.future = [];
        }

        return history;
      });
    };

    this.moveService
      .listenIncrementalAreaSelector(
        this.resizeHandler,
        this.host,
        position,
        onStart,
      )
      .pipe(filterNil(), takeUntilDestroyed(this.destroyRef))
      .subscribe((size) => {
        if (this.host) {
          this.store.dispatch(
            BoardActions.batchNodeActions({
              history: false,
              actions: [
                {
                  data: {
                    type: this.host.nodeType,
                    id: this.host.id,
                    content: {
                      position: {
                        x: size.x,
                        y: size.y,
                      },
                      width: size.width,
                      height: size.height,
                    },
                  },
                  op: 'patch',
                },
              ],
            }),
          );

          this.appRef.tick();
        }
      });
  }
}
