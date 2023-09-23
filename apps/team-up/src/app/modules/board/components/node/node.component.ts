import { loadNode } from '@/app/register-node';
import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  ElementRef,
  Input,
  ViewChild,
  ViewContainerRef,
  Type,
  HostListener,
  ComponentRef,
  DestroyRef,
} from '@angular/core';
import { RxState } from '@rx-angular/state';
import { Point, TuNode } from '@team-up/board-commons';
import { distinctUntilChanged, filter, fromEvent, map, take } from 'rxjs';
import { Draggable } from '../../models/draggable.model';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Store } from '@ngrx/store';
import { selectFocusId } from '../../selectors/page.selectors';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { pageFeature } from '../../reducers/page.reducer';
import { DynamicComponent } from './dynamic-component';

interface State {
  position: Point;
  node: TuNode;
  focus: boolean;
}

@Component({
  selector: 'team-up-node',
  styleUrls: ['./node.component.scss'],
  template: ` <ng-container #nodeHost></ng-container>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  providers: [RxState],
})
export class NodeComponent implements OnInit, Draggable {
  private state = inject(RxState<State>);
  private boardDragDirective = inject(BoardDragDirective);
  private el = inject(ElementRef<HTMLElement>);
  private store = inject(Store);
  private cmp?: ComponentRef<DynamicComponent>;
  private destroyRef = inject(DestroyRef);

  @Input({ required: true })
  public set node(node: TuNode) {
    this.state.set({ node });
  }

  @ViewChild('nodeHost', { read: ViewContainerRef })
  public nodeHost!: ViewContainerRef;

  @HostListener('mousedown', ['$event'])
  public mousedown(event: MouseEvent) {
    this.store.dispatch(
      PageActions.setFocusId({
        focusId: this.state.get('node').id,
        ctrlKey: event.ctrlKey,
      })
    );
  }

  public get nativeElement() {
    return this.el.nativeElement;
  }

  public get id() {
    return this.state.get('node').id;
  }

  public get nodeType() {
    return this.state.get('node').type;
  }

  public get preventDrag() {
    return !this.state.get('focus');
  }

  public get position() {
    return this.state.get('position');
  }

  public ngOnInit() {
    this.boardDragDirective.setHost(this);

    loadNode(this.state.get('node').type).then((node) => {
      this.loadComponent(node.component as Type<DynamicComponent>);
    });

    this.state.hold(this.state.select('node'), (node) => {
      this.state.set({ position: node.content.position as Point });
    });

    this.state.hold(
      this.state.select('position').pipe(distinctUntilChanged()),
      (position) => {
        this.nativeElement.style.transform = `translate(${position.x}px, ${position.y}px)`;
      }
    );

    this.state.connect(
      'focus',
      this.store
        .select(selectFocusId)
        .pipe(map((it) => it.includes(this.state.get('node').id)))
    );

    this.state.hold(this.state.select('focus'), (focus) => {
      this.cmp?.setInput('focus', focus);
    });

    this.state.hold(this.state.select('node'), (focus) => {
      this.cmp?.setInput('node', focus);
    });

    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        filter((event: KeyboardEvent) => event.key === 'Delete'),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.onDeletePress();
      });
  }

  private onDeletePress() {
    const instance = this.cmp?.instance;

    if (instance) {
      if (instance.preventDelete?.()) {
        return;
      }
    }

    if (this.state.get('focus')) {
      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: true,
          actions: [
            {
              data: {
                type: this.state.get('node').type,
                id: this.state.get('node').id,
              },
              op: 'remove',
            },
          ],
        })
      );
    }
  }

  private loadComponent(component: Type<DynamicComponent>) {
    this.store
      .select(pageFeature.selectAdditionalContext)
      .pipe(take(1))
      .subscribe((context) => {
        const pasted = context[this.id] === 'pasted';
        this.cmp = this.nodeHost.createComponent(component);

        this.cmp.setInput('node', this.state.get('node'));
        this.cmp.setInput('focus', this.state.get('focus'));
        this.cmp.setInput('pasted', pasted);
        const zIndex = (this.cmp.instance as { zIndex?: number })?.zIndex;

        if (zIndex) {
          this.nativeElement.style.setProperty('--z-index-node', zIndex);
        }
      });
  }
}
