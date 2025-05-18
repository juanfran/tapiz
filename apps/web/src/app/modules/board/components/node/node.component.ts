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
import { BoardTNode } from '@tapiz/board-commons';
import { take } from 'rxjs';
import { Store } from '@ngrx/store';
import { BoardPageActions } from '../../actions/board-page.actions';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { DynamicComponent } from './dynamic-component';
import { compose, rotateDEG, translate, toCSS } from 'transformation-matrix';
import { NodeStore } from '../../services/node.store';
import { isInputField } from '@tapiz/cdk/utils/is-input-field';
import { input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'tapiz-node',
  styleUrls: ['./node.component.scss'],
  template: ' <ng-container #nodeHost></ng-container>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  providers: [RxState, NodeStore],
  host: {
    '[class.highlight]': 'highlight()',
    '[style.width.px]': 'size().width',
    '[style.height.px]': 'size().height',
    '[style.transform]': 'transform()',
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

  node = input.required<BoardTNode>();

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
        width: content.width,
        height: content.height,
      };
    }

    return {};
  });

  transform = computed(() => {
    const { point, rotation } = this.position();

    return toCSS(compose(translate(point.x, point.y), rotateDEG(rotation)));
  });

  focusId = this.store.selectSignal(boardPageFeature.selectFocusId);

  focus = computed(() => {
    return this.focusId().includes(this.node().id);
  });

  @ViewChild('nodeHost', { read: ViewContainerRef })
  public nodeHost!: ViewContainerRef;

  // default focus, some components may override this with this.#nodesStore.setFocusNode
  @HostListener('mousedown', ['$event'])
  public mousedown(event: MouseEvent) {
    this.store.dispatch(
      BoardPageActions.setFocusId({
        focusId: this.node().id,
        ctrlKey: event.ctrlKey,
      }),
    );
  }

  public highlight = this.#nodeStore.highlight;

  public get nativeElement() {
    return this.el.nativeElement;
  }

  constructor() {
    this.store
      .select(boardPageFeature.selectBoardMode)
      .pipe(takeUntilDestroyed())
      .subscribe((layer) => {
        this.#nodeStore.updateState({
          layer,
        });
      });
  }

  public ngOnInit() {
    loadNode(this.node().type).then((node) => {
      this.loadComponent(node.component);
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
      .select(boardPageFeature.selectAdditionalContext)
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

        const zIndex = this.cmp.instance.zIndex ?? 1;

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
