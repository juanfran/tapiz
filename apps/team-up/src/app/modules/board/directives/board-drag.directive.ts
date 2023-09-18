import { AfterViewInit, Directive, OnDestroy, inject } from '@angular/core';
import { Draggable } from '../models/draggable.model';
import { MultiDragService } from '../services/multi-drag.service';

@Directive({
  selector: '[teamUpBoardDrag]',
  standalone: true,
})
export class BoardDragDirective implements AfterViewInit, OnDestroy {
  public host?: Draggable;
  private multiDragService = inject(MultiDragService);

  public ngAfterViewInit() {
    if (this.host) {
      this.multiDragService.add(this.host);
    }
  }

  public setHost(host: Draggable) {
    this.host = host;
  }

  public ngOnDestroy() {
    if (this.host) {
      this.multiDragService.remove(this.host);
    }
  }
}
