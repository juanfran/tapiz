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
    if (this.host) {
      this.multiDragService.add(this.host, this.destroyRef);
    }
  }

  public setHost(host: Draggable) {
    this.host = host;
  }
}
