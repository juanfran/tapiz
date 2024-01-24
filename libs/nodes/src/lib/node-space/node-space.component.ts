import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Point, Resizable, Rotatable, TuNode } from '@team-up/board-commons';
import { Draggable } from '@team-up/cdk/models/draggable.model';
import { MultiDragService } from '@team-up/cdk/services/multi-drag.service';
import { ResizeHandlerComponent } from '@team-up/ui/resize';
import { RotateHandlerComponent } from '@team-up/ui/rotate';
import { NodesStore } from '../services/nodes.store';

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
        <team-up-resize-handler
          [node]="node"
          [scale]="scale()" />
      }

      @if (isRotable(node)) {
        <div
          class="rotate-wrapper"
          [style.transform]="'scale(' + scale() + ')'">
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
  #destroyRef = inject(DestroyRef);
  #multiDragService = inject(MultiDragService);

  #zoom = inject(NodesStore).zoom;
  scale = computed(() => {
    const zoom = this.#zoom();

    if (zoom < 1) {
      return 1 + 3 - zoom * 3;
    }

    return 1;
  });

  active = signal(true);

  @Input({ required: true })
  node!: TuNode<{
    position: Point;
  }>;

  @Input()
  draggable = true;

  @Input()
  resize = false;

  @Input()
  rotate = false;

  @Input()
  set enabled(dragReady: boolean) {
    this.active.set(dragReady);
  }

  @ViewChild('drag')
  drag!: ElementRef<HTMLElement>;

  get preventDrag() {
    return !this.active();
  }

  get position() {
    return this.node.content.position;
  }

  get id() {
    return this.node.id;
  }

  get nodeType() {
    return this.node.type;
  }

  get nativeElement() {
    return this.drag.nativeElement;
  }

  isResizable(node: TuNode<unknown>): node is TuNode<Resizable> {
    return this.resize;
  }

  isRotable(node: TuNode<unknown>): node is TuNode<Rotatable> {
    return this.rotate;
  }

  ngAfterViewInit(): void {
    this.#multiDragService.add(this, this.#destroyRef);
  }
}
