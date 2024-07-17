import { loadNode } from '../../../../register-node';

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  ElementRef,
  ViewChild,
  ViewContainerRef,
  Type,
  HostListener,
  ComponentRef,
  HostBinding,
  signal,
  Injector,
  effect,
  computed,
} from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BoardTuNode } from '@tapiz/board-commons';
import { take } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectFocusId } from '../../selectors/page.selectors';
import { PageActions } from '../../actions/page.actions';
import { pageFeature } from '../../reducers/page.reducer';
import { DynamicComponent } from './dynamic-component';
import { compose, rotateDEG, translate, toCSS } from 'transformation-matrix';
import { NodeStore } from '@tapiz/nodes/node/node.store';
import { isInputField } from '@tapiz/cdk/utils/is-input-field';
import { input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'tapiz-node',
  styleUrls: ['./node.component.scss'],
  template: ' <ng-container #nodeHost></ng-container>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  providers: [RxState, NodeStore],
  host: {
    '[class.highlight]': 'hightlight()',
  },
})
export class NodeComponent implements OnInit {
  readonly #nodeStore = inject(NodeStore);
  private el = inject(ElementRef<HTMLElement>);
  private store = inject(Store);
  private cmp?: ComponentRef<DynamicComponent>;
  private injector = inject(Injector);

  @HostBinding('class') get layer() {
    return `layer-${this.node().content.layer}`;
  }

  @HostBinding('attr.data-id') get id() {
    return this.node().id;
  }

  node = input.required<BoardTuNode>();

  position = computed(() => {
    const content = this.node().content;

    return {
      point: content.position,
      rotation: content?.rotation ?? 0,
    };
  });

  size = computed(() => {
    const content = this.node().content;

    if ('width' in content && 'height' in content) {
      return {
        size: {
          width: content.width as number,
          height: content.height as number,
        },
      };
    }

    return {};
  });

  focusId = this.store.selectSignal(selectFocusId);

  focus = computed(() => {
    return this.focusId().includes(this.node().id);
  });

  @ViewChild('nodeHost', { read: ViewContainerRef })
  public nodeHost!: ViewContainerRef;

  @HostListener('mousedown', ['$event'])
  public mousedown(event: MouseEvent) {
    this.store.dispatch(
      PageActions.setFocusId({
        focusId: this.node().id,
        ctrlKey: event.ctrlKey,
      }),
    );
  }

  public hightlight = this.#nodeStore.highlight;

  public get nativeElement() {
    return this.el.nativeElement;
  }

  constructor() {
    effect(() => {
      const { point, rotation } = this.position();
      this.nativeElement.style.transform = toCSS(
        compose(translate(point.x, point.y), rotateDEG(rotation)),
      );
    });

    effect(() => {
      const { size } = this.size();

      if (size) {
        this.nativeElement.style.width = `${size.width}px`;
        this.nativeElement.style.height = `${size.height}px`;
      }
    });

    this.store
      .select(pageFeature.selectBoardMode)
      .pipe(takeUntilDestroyed())
      .subscribe((layer) => {
        this.#nodeStore.updateState({
          layer,
        });
      });
  }

  public ngOnInit() {
    loadNode(this.node().type).then((node) => {
      this.loadComponent(node.component as Type<DynamicComponent>);
    });
  }

  preventDelete() {
    if (isInputField()) {
      return true;
    }

    const instance = this.cmp?.instance;

    if (instance?.preventDelete?.()) {
      return true;
    }

    return false;
  }

  private loadComponent(component: Type<DynamicComponent>) {
    this.store
      .select(pageFeature.selectAdditionalContext)
      .pipe(take(1))
      .subscribe((context) => {
        const pasted = signal(context[this.node().id] === 'pasted');
        this.cmp = this.nodeHost.createComponent(component);

        this.cmp.setInput('node', this.node());
        this.cmp.setInput('focus', this.focus());
        this.cmp.setInput('pasted', pasted());

        this.#nodeStore.updateState({
          pasted: false,
          node: this.node(),
          focus: this.focus(),
        });

        const zIndex = (this.cmp.instance as { zIndex?: number })?.zIndex ?? 1;

        this.nativeElement.style.setProperty('--z-index-node', zIndex);
      });

    effect(
      () => {
        if (!this.cmp) {
          return;
        }

        this.cmp.setInput('node', this.node());
      },
      { injector: this.injector },
    );

    effect(
      () => {
        if (!this.cmp) {
          return;
        }

        this.cmp.setInput('focus', this.focus());
      },
      { injector: this.injector },
    );
  }
}
