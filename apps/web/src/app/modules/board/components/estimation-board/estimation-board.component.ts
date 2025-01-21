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
import { NodesStore } from '../../services/nodes.store';
import { toObservable } from '@angular/core/rxjs-interop';
import { input } from '@angular/core';
import { BoardFacade } from '../../../../services/board-facade.service';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../reducers/boardPage.reducer';

@Component({
  selector: 'tapiz-estimation-board',
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
        [userId]="userId()"
        [parentId]="parentId()"></tapiz-estimation>
    }
  `,
  styleUrls: ['./estimation-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstimationBoardComponent implements AfterViewInit, OnInit {
  node = input.required<TuNode<EstimationBoard, 'estimation'>>();
  pasted = input.required<boolean>();
  focus = input.required<boolean>();

  @ViewChild('drag')
  drag!: ElementRef<HTMLButtonElement>;

  #el = inject(ElementRef<HTMLElement>);
  #multiDragService = inject(MultiDragService);
  #destroyRef = inject(DestroyRef);
  #injector = inject(Injector);
  #boardFacade = inject(BoardFacade);
  #store = inject(Store);
  #boardMode = this.#store.selectSignal(boardPageFeature.selectBoardMode);

  nodesStore = inject(NodesStore);
  estimation = signal<EstimationNodes[]>([]);
  parentId = computed(() => {
    return this.node().id;
  });
  userId = this.#boardFacade.userId;

  showDrag = computed(() => {
    if (this.#boardMode() === 0) {
      return this.node().content.layer === 0;
    } else {
      return this.node().content.layer === 1;
    }
  });

  ngOnInit() {
    toObservable(this.node, {
      injector: this.#injector,
    }).subscribe((node) => {
      const children = (node.children as EstimationNodes[]) ?? [];

      if (!R.equals(children, this.estimation())) {
        this.estimation.set((node.children as EstimationNodes[]) ?? []);
      }
    });
  }

  get nativeElement() {
    return this.#el.nativeElement;
  }

  get id() {
    return this.node().id;
  }

  get nodeType() {
    return this.node().type;
  }

  get position() {
    return this.node().content.position;
  }

  get handler() {
    return this.drag.nativeElement;
  }

  zIndex = 6;

  ngAfterViewInit() {
    this.#multiDragService.register({
      id: this.id,
      nodeType: this.nodeType,
      handler: this.handler,
      position: () => this.position,
      destroyRef: this.#destroyRef,
    });
  }
}
