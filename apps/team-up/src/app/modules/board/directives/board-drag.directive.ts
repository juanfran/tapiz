import { AfterViewInit, DestroyRef, Directive, inject } from '@angular/core';
import { Draggable } from '@team-up/cdk/models/draggable.model';
import { MultiDragService } from '@team-up/cdk/services/multi-drag.service';

@Directive({
  selector: '[teamUpBoardDrag]',
  standalone: true,
})
export class BoardDragDirective implements AfterViewInit {
  public host?: Draggable;
  private multiDragService = inject(MultiDragService);
  private destroyRef = inject(DestroyRef);

  public ngAfterViewInit() {
    const host = this.host;

    if (host) {
      this.multiDragService.register({
        id: host.id,
        nodeType: host.nodeType,
        handler: host.nativeElement,
        preventDrag: () => {
          if (host.preventDrag) {
            return host.preventDrag();
          }

          return false;
        },
        position: () => host.position,
        destroyRef: this.destroyRef,
      });
    }
  }

  public setHost(host: Draggable) {
    this.host = host;
  }
}
