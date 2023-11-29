import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Point, Resizable, Rotatable, TuNode } from '@team-up/board-commons';
import { Draggable } from '@team-up/cdk/models/draggable.model';

import { MultiDragService } from '@team-up/cdk/services/multi-drag.service';

import { ResizeHandlerComponent } from '../resize/resize-handler.component';
import { RotateHandlerComponent } from '../rotate/rotate-handler.component';

@Component({
  selector: 'team-up-node-space',
  template: `
    <div
      #drag
      class="content"
      [class.drag-outline]="active()">
      <ng-content />
    </div>

    @if (active()) {
      @if (isResizable(node)) {
        <team-up-resize-handler [node]="node" />
      }

      @if (isRotable(node)) {
        <div class="rotate-wrapper">
          <team-up-rotate-handler [node]="node" />
        </div>
      }
    }
  `,
  styleUrl: './node-space.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ResizeHandlerComponent, RotateHandlerComponent],
})
export class NodeSpaceComponent implements AfterViewInit, Draggable {
  private destroyRef = inject(DestroyRef);
  private multiDragService = inject(MultiDragService);

  public active = signal(true);

  @Input({ required: true })
  public node!: TuNode<{
    position: Point;
  }>;

  @Input()
  public draggable = true;

  @Input()
  public resize = false;

  @Input()
  public rotate = false;

  @Input()
  public set enabled(dragReady: boolean) {
    this.active.set(dragReady);
  }

  @ViewChild('drag')
  public drag!: ElementRef<HTMLElement>;

  public get preventDrag() {
    return !this.active();
  }

  public get position() {
    return this.node.content.position;
  }

  public get id() {
    return this.node.id;
  }

  public get nodeType() {
    return this.node.type;
  }

  public get nativeElement() {
    return this.drag.nativeElement;
  }

  public isResizable(node: TuNode<unknown>): node is TuNode<Resizable> {
    return this.resize;
  }

  public isRotable(node: TuNode<unknown>): node is TuNode<Rotatable> {
    return this.rotate;
  }

  public ngAfterViewInit(): void {
    this.multiDragService.add(this, this.destroyRef);
  }
}
