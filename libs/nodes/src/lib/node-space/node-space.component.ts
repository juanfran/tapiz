import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { Point, Resizable, Rotatable, TuNode } from '@team-up/board-commons';
import { MultiDragService } from '@team-up/cdk/services/multi-drag.service';
import { ResizeHandlerComponent } from '@team-up/ui/resize';
import { RotateHandlerComponent } from '@team-up/ui/rotate';
import { NodesStore } from '../services/nodes.store';
import { input } from '@angular/core';

@Component({
  selector: 'team-up-node-space',

  template: `
    <div
      #drag
      class="content"
      [class.drag-outline]="enabled()">
      <ng-content />
    </div>

    @if (node(); as node) {
      @if (enabled()) {
        @if (isResizable(node)) {
          <team-up-resize-handler
            [node]="node"
            [scale]="scale()" />
        }

        @if (isRotable(node)) {
          <div class="rotate-wrapper">
            <team-up-rotate-handler
              [node]="node"
              [style.transform]="'scale(' + scale() + ')'" />
          </div>
        }
      }
    }
  `,
  styleUrl: './node-space.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ResizeHandlerComponent, RotateHandlerComponent],
})
export class NodeSpaceComponent implements AfterViewInit {
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

  enabled = input(true);

  node = input.required<
    TuNode<{
      position: Point;
    }>
  >();

  draggable = input(true);

  resize = input(false);

  rotate = input(false);

  @ViewChild('drag')
  drag!: ElementRef<HTMLElement>;

  get preventDrag() {
    return !this.enabled();
  }

  get position() {
    return this.node().content.position;
  }

  get id() {
    return this.node().id;
  }

  get nodeType() {
    return this.node().type;
  }

  get nativeElement() {
    return this.drag.nativeElement;
  }

  isResizable(node: TuNode<unknown>): node is TuNode<Resizable> {
    return this.resize();
  }

  isRotable(node: TuNode<unknown>): node is TuNode<Rotatable> {
    return this.rotate();
  }

  ngAfterViewInit(): void {
    this.#multiDragService.register({
      id: this.id,
      nodeType: this.nodeType,
      handler: this.drag.nativeElement,
      preventDrag: () => this.preventDrag,
      position: () => this.position,
      destroyRef: this.#destroyRef,
    });
  }
}
