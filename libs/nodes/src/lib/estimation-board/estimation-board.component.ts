import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';

import { EstimationBoard, TuNode, EstimationNodes } from '@tapiz/board-commons';
import { MatIconModule } from '@angular/material/icon';
import { EstimationComponent } from '../estimation/estimation.component';
import * as R from 'remeda';
import { MultiDragService } from '@tapiz/cdk/services/multi-drag.service';
import { NodesStore } from '../services/nodes.store';
import { toObservable } from '@angular/core/rxjs-interop';
import { input } from '@angular/core';

@Component({
  selector: 'tapiz-estimation-board',
  standalone: true,
  imports: [EstimationComponent, MatIconModule],

  template: `
    <div
      class="drag-indicator"
      [style.visibility]="showDrag() ? 'visible' : 'hidden'">
      <button #drag>
        <mat-icon>drag_indicator</mat-icon>
      </button>
    </div>
    @if (parentId()) {
      <tapiz-estimation
        [class.focus]="focus()"
        [nodes]="estimation()"
        [userId]="nodesStore.userId()"
        [parentId]="parentId()"></tapiz-estimation>
    }
  `,
  styleUrls: ['./estimation-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstimationBoardComponent implements AfterViewInit, OnInit {
  public node = input.required<TuNode<EstimationBoard, 'estimation'>>();

  public pasted = input.required<boolean>();

  public focus = input.required<boolean>();

  @ViewChild('drag')
  public drag!: ElementRef<HTMLButtonElement>;

  private el = inject(ElementRef<HTMLElement>);
  private multiDragService = inject(MultiDragService);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);

  public nodesStore = inject(NodesStore);
  public estimation = signal<EstimationNodes[]>([]);
  public parentId = computed(() => {
    return this.node().id;
  });

  showDrag = computed(() => {
    if (this.nodesStore.boardMode() === 0) {
      return this.node().content.layer === 0;
    } else {
      return this.node().content.layer === 1;
    }
  });

  public ngOnInit() {
    toObservable(this.node, {
      injector: this.injector,
    }).subscribe((node) => {
      const children = (node.children as EstimationNodes[]) ?? [];

      if (!R.equals(children, this.estimation())) {
        this.estimation.set((node.children as EstimationNodes[]) ?? []);
      }
    });
  }

  public get nativeElement() {
    return this.el.nativeElement;
  }

  public get id() {
    return this.node().id;
  }

  public get nodeType() {
    return this.node().type;
  }

  public get position() {
    return this.node().content.position;
  }

  public get handler() {
    return this.drag.nativeElement;
  }

  public zIndex = 6;

  public ngAfterViewInit() {
    this.multiDragService.register({
      id: this.id,
      nodeType: this.nodeType,
      handler: this.handler,
      position: () => this.position,
      destroyRef: this.destroyRef,
    });
  }
}
