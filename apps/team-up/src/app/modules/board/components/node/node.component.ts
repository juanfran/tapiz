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
  HostBinding,
} from '@angular/core';
import { RxState } from '@rx-angular/state';
import { Point, TuNode } from '@team-up/board-commons';
import { distinctUntilChanged, map, take } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectFocusId } from '../../selectors/page.selectors';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { pageFeature } from '../../reducers/page.reducer';
import { DynamicComponent } from './dynamic-component';
import { HotkeysService } from '@team-up/cdk/services/hostkeys.service';

interface State {
  position: Point;
  node: TuNode<{ position: Point; layer: number }>;
  focus: boolean;
}

@Component({
  selector: 'team-up-node',
  styleUrls: ['./node.component.scss'],
  template: ` <ng-container #nodeHost></ng-container>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  providers: [RxState, HotkeysService],
})
export class NodeComponent implements OnInit {
  private state = inject(RxState) as RxState<State>;
  private el = inject(ElementRef<HTMLElement>);
  private store = inject(Store);
  private cmp?: ComponentRef<DynamicComponent>;
  private hotkeysService = inject(HotkeysService);

  @HostBinding('class') get layer() {
    return `layer-${this.state.get('node').content.layer}`;
  }

  @Input({ required: true })
  public set node(node: TuNode) {
    this.state.set({ node: node as State['node'] });
  }

  @ViewChild('nodeHost', { read: ViewContainerRef })
  public nodeHost!: ViewContainerRef;

  @HostListener('mousedown', ['$event'])
  public mousedown(event: MouseEvent) {
    this.store.dispatch(
      PageActions.setFocusId({
        focusId: this.state.get('node').id,
        ctrlKey: event.ctrlKey,
      }),
    );
  }

  public get nativeElement() {
    return this.el.nativeElement;
  }

  public ngOnInit() {
    loadNode(this.state.get('node').type).then((node) => {
      this.loadComponent(node.component as Type<DynamicComponent>);
    });

    this.state.hold(this.state.select('node'), (node) => {
      this.state.set({ position: node.content.position });
    });

    this.state.hold(
      this.state.select('position').pipe(distinctUntilChanged()),
      (position) => {
        this.nativeElement.style.transform = `translate(${position.x}px, ${position.y}px)`;
      },
    );

    this.state.connect(
      'focus',
      this.store
        .select(selectFocusId)
        .pipe(map((it) => it.includes(this.state.get('node').id))),
    );

    this.state.hold(this.state.select('focus'), (focus) => {
      this.cmp?.setInput('focus', focus);
    });

    this.state.hold(this.state.select('node'), (focus) => {
      this.cmp?.setInput('node', focus);
    });

    this.hotkeysService.listen({ key: 'Delete' }).subscribe(() => {
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
        }),
      );
    }
  }

  private loadComponent(component: Type<DynamicComponent>) {
    this.store
      .select(pageFeature.selectAdditionalContext)
      .pipe(take(1))
      .subscribe((context) => {
        const pasted = context[this.state.get('node').id] === 'pasted';
        this.cmp = this.nodeHost.createComponent(component);

        this.cmp.setInput('node', this.state.get('node'));
        this.cmp.setInput('focus', this.state.get('focus'));

        this.cmp.setInput('pasted', pasted);
        const zIndex = (this.cmp.instance as { zIndex?: number })?.zIndex ?? 1;

        this.nativeElement.style.setProperty('--z-index-node', zIndex);
      });
  }
}
