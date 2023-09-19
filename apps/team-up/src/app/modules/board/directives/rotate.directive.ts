import { ApplicationRef, DestroyRef, Directive, inject } from '@angular/core';
import { MoveService } from '../services/move.service';
import { filterNil } from '@/app/commons/operators/filter-nil';
import { Store } from '@ngrx/store';
import { BoardActions } from '../actions/board.actions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Rotatable } from '../models/rotatable.model';

@Directive({
  selector: '[teamUpRotate]',
  standalone: true,
})
export class RotateDirective {
  private moveService = inject(MoveService);
  private store = inject(Store);
  private appRef = inject(ApplicationRef);
  private destroyRef = inject(DestroyRef);

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

    this.moveService
      .listenRotation(this.rotateHandler, host)
      .pipe(filterNil(), takeUntilDestroyed(this.destroyRef))
      .subscribe((path) => {
        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  } as any,
                },
                op: 'patch',
              },
            ],
          })
        );
      });
  }
}
