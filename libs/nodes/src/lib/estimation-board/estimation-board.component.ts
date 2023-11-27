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
        [class.focus]="focus"
        [nodes]="estimation()"
        [userId]="nodesStore.userId()"
        [parentId]="parentId()"></team-up-estimation>
    </ng-container>
  `,
  styleUrls: ['./estimation-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstimationBoardComponent implements AfterViewInit {
  @Input({ required: true })
  public set node(node: TuNode<EstimationBoard, 'estimation'>) {
    this.estimationNode = node;
    const children = (node.children as EstimationNodes[]) ?? [];

    if (!R.equals(children, this.estimation())) {
      this.estimation.set((node.children as EstimationNodes[]) ?? []);
    }
    this.parentId.set(node.id);
  }

  @Input({ required: true })
  public focus = false;

  @Input({ required: true })
  public pasted = false;

  @ViewChild('drag')
  public drag!: ElementRef<HTMLButtonElement>;

  private el = inject(ElementRef<HTMLElement>);
  private multiDragService = inject(MultiDragService);
  private destroyRef = inject(DestroyRef);

  public nodesStore = inject(NodesStore);
  public estimation = signal<EstimationNodes[]>([]);
  public parentId = signal<string>('');
  public estimationNode!: TuNode<EstimationBoard, 'estimation'>;

  public get nativeElement() {
    return this.el.nativeElement;
  }

  public get preventDrag() {
    return !this.focus;
  }

  public get id() {
    return this.estimationNode.id;
  }

  public get nodeType() {
    return this.estimationNode.type;
  }

  public get position() {
    return this.estimationNode.content.position;
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
