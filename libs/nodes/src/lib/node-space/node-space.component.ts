import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
  output,
} from '@angular/core';
import { Point, Resizable, Rotatable, TuNode } from '@tapiz/board-commons';
import { MultiDragService } from '@tapiz/cdk/services/multi-drag.service';
import { ResizeHandlerComponent } from '@tapiz/ui/resize';
import { RotateHandlerComponent } from '@tapiz/ui/rotate';
import { NodesStore } from '../services/nodes.store';
import { input } from '@angular/core';

@Component({
  selector: 'tapiz-node-space',

  template: `
    <div
      #drag
      class="content"
      [class.drag-outline]="showOutline()">
      <ng-content />
    </div>

    @if (node(); as node) {
      @if (showOutline()) {
        @if (isResizable(node)) {
          <tapiz-resize-handler
            [node]="node"
            [scale]="scale()" />
        }

        @if (isRotable(node)) {
          <div class="rotate-wrapper">
            <tapiz-rotate-handler
              [node]="node"
              [style.transform]="'scale(' + scale() + ')'" />
          </div>
        }
      }
    }
  `,
  styleUrl: './node-space.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResizeHandlerComponent, RotateHandlerComponent],
  host: {
    '[style.--cursor]': 'cursor()',
  },
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
  showOutline = input(false);

  node = input.required<
    TuNode<{
      position: Point;
    }>
  >();

  draggable = input(true);
  resize = input(false);
  rotate = input(false);
  cursor = input('grab');
  drop = output();
  dragging = output();

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
      drop: () => {
        this.drop.emit();
      },
      dragging: () => {
        this.dragging.emit();
      },
    });
  }
}
