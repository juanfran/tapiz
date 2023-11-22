import { DestroyRef, Directive, inject } from '@angular/core';
import { MoveService } from '../services/move.service';
import { filterNil } from '@/app/commons/operators/filter-nil';
import { Store } from '@ngrx/store';
import { BoardActions } from '../actions/board.actions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Rotatable } from '../models/rotatable.model';
import { BoardFacade } from '@/app/services/board-facade.service';
import { StateActions } from '@team-up/board-commons';

@Directive({
  selector: '[teamUpRotate]',
  standalone: true,
})
export class RotateDirective {
  private moveService = inject(MoveService);
  private store = inject(Store);
  private destroyRef = inject(DestroyRef);
  private boardFacade = inject(BoardFacade);

  private host?: Rotatable;

  private rotateHandler?: HTMLElement;

  public setHost(host: Rotatable) {
    this.host = host;
  }

  public setHandler(handler: HTMLElement) {
    this.rotateHandler = handler;
    this.listen();
  }

  public listen() {
    if (!this.rotateHandler || !this.host) {
      return;
    }

    const host = this.host;

    const onStart = () => {
      this.boardFacade.patchHistory((history) => {
        if (this.host) {
          const nodeAction: StateActions = {
            data: {
              type: this.host.nodeType,
              id: this.host.id,
              content: {
                rotation: this.host.rotation,
                position: {
                  x: this.host.position.x,
                  y: this.host.position.y,
                },
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
      .listenRotation(this.rotateHandler, host, onStart)
      .pipe(filterNil(), takeUntilDestroyed(this.destroyRef))
      .subscribe((path) => {
        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: false,
            actions: [
              {
                data: {
                  type: host.nodeType,
                  id: host.id,
                  content: {
                    rotation: path.rotation,
                    position: {
                      x: path.x,
                      y: path.y,
                    },
                  },
                },
                op: 'patch',
              },
            ],
          }),
        );
      });
  }
}
