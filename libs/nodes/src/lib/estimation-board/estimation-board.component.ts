import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  Input,
  OnInit,
  Signal,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  EstimationBoard,
  TuNode,
  EstimationNodes,
} from '@team-up/board-commons';
import { MatIconModule } from '@angular/material/icon';
import { EstimationComponent } from '../estimation/estimation.component';
import * as R from 'remeda';
import { MultiDragService } from '@team-up/cdk/services/multi-drag.service';
import { NodesStore } from '../services/nodes.store';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'team-up-estimation-board',
  standalone: true,
  imports: [CommonModule, EstimationComponent, MatIconModule],
  template: `
    <div class="drag-indicator">
      <button #drag>
        <mat-icon>drag_indicator</mat-icon>
      </button>
    </div>
    <ng-container *ngIf="parentId()">
      <team-up-estimation
        [class.focus]="focus()"
        [nodes]="estimation()"
        [userId]="nodesStore.userId()"
        [parentId]="parentId()"></team-up-estimation>
    </ng-container>
  `,
  styleUrls: ['./estimation-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstimationBoardComponent implements AfterViewInit, OnInit {
  @Input({ required: true })
  public node!: Signal<TuNode<EstimationBoard, 'estimation'>>;

  @Input()
  public pasted!: Signal<boolean>;

  @Input()
  public focus!: Signal<boolean>;

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

  public get preventDrag() {
    return !this.focus();
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

  public preventDelete() {
    return true;
  }

  public ngAfterViewInit() {
    this.multiDragService.add(this, this.destroyRef);
  }
}