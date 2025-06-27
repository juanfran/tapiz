import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { BoardTuNode } from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { PortalComponent } from '@tapiz/ui/portal';

@Component({
  selector: 'tapiz-editor-portal',
  imports: [PortalComponent],
  template: `
    <tapiz-portal name="editor-portal">
      <div
        class="portal"
        [style.inline-size.px]="rect().width"
        [style.block-size.px]="rect().height"
        [style.left.px]="rect().position.x"
        [style.top.px]="rect().position.y">
        <ng-content></ng-content>
      </div>
    </tapiz-portal>
  `,
  styleUrl: './editor-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorPortalComponent {
  #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  #store = inject(Store);
  node = input.required<BoardTuNode>();

  #width = computed(() => this.node().content.width);
  #height = computed(() => this.node().content.height);
  #position = computed(() => this.node().content.position);
  #ready = signal(false);
  #zoom = this.#store.selectSignal(boardPageFeature.selectZoom);

  rect = computed(() => {
    const { left, top } = this.#getDiff();

    const width = this.#width();
    const height = this.#height();
    const position = this.#position();

    if (!width || !height || !position || !this.#ready()) {
      return {
        width: 0,
        height: 0,
        position: {
          x: 0,
          y: 0,
        },
      };
    }

    return {
      width: width - left * 2,
      height: height - top * 2,
      position: {
        x: position.x + left,
        y: position.y + top,
      },
    };
  });

  constructor() {
    afterNextRender(() => {
      this.#ready.set(true);
    });
  }

  #getDiff() {
    const wrapperElm = this.#elementRef.nativeElement.closest('tapiz-node');

    if (!wrapperElm) {
      return { left: 0, top: 0 };
    }

    const position = this.#elementRef.nativeElement.getBoundingClientRect();

    return {
      left:
        (position.left - wrapperElm.getBoundingClientRect().left) /
        this.#zoom(),
      top:
        (position.top - wrapperElm.getBoundingClientRect().top) / this.#zoom(),
    };
  }
}
