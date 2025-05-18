import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  OnInit,
  HostListener,
  signal,
  inject,
  Injector,
  effect,
  computed,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { Drawing, Panel, TNode } from '@tapiz/board-commons';
import { HotkeysService } from '@tapiz/cdk/services/hostkeys.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { HistoryService } from '../../services/history.service';
import { NodeSpaceComponent } from '../node-space';
import { EditorViewComponent } from '@tapiz/ui/editor-view';
import { switchMap } from 'rxjs';
import { SafeHtmlPipe } from '@tapiz/cdk/pipes/safe-html';
import { DrawingDirective, DrawingStore } from '../drawing';
import { NodeStore } from '../../services/node.store';
import { NodesActions } from '../../services/nodes-actions';
import { input } from '@angular/core';
import { EditorPortalComponent } from '../editor-portal/editor-portal.component';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { NodesStore } from '../../services/nodes.store';
import { boardPageFeature } from '../../reducers/boardPage.reducer';

@Component({
  selector: 'tapiz-panel',
  template: `
    <tapiz-node-space
      [node]="node()"
      [resize]="true"
      [rotate]="true"
      [showOutline]="focus()"
      [enabled]="!edit()">
      <div class="inner">
        <div class="editor-wrapper">
          @if (!edit()) {
            <div
              class="rich-text"
              [innerHTML]="node().content.text | safeHtml"></div>
          } @else {
            <tapiz-editor-portal [node]="node()">
              <tapiz-editor-view
                #editorView="editorView"
                [class.readonly]="!edit()"
                [node]="node()"
                [toolbar]="edit()"
                [layoutToolbarOptions]="true"
                [content]="initialText()"
                [focus]="edit()"
                [mentions]="mentions()"
                [fontSize]="true"
                (mentioned)="onMention($event)"
                (contentChange)="setText($event)" />
            </tapiz-editor-portal>
          }
        </div>

        <canvas
          [tapizDrawing]="node().content.drawing"
          (drawing)="setDrawing($event)"
          [attr.width]="node().content.width"
          [attr.height]="node().content.height"></canvas>
      </div>
    </tapiz-node-space>
  `,
  styleUrls: ['./panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState, HotkeysService],
  imports: [
    NodeSpaceComponent,
    EditorViewComponent,
    SafeHtmlPipe,
    DrawingDirective,
    EditorPortalComponent,
  ],
  host: {
    '[class.focus]': 'focus()',
    '[class.toolbar]': 'edit()',
    '[class.drawing]': 'drawing()',
    '[class.active-layer]': 'activeLayer()',
  },
})
export class PanelComponent implements OnInit {
  #injector = inject(Injector);
  #historyService = inject(HistoryService);
  #el = inject(ElementRef);
  #store = inject(Store);
  #drawingStore = inject(DrawingStore);
  #nodeStore = inject(NodeStore);
  #nodesActions = inject(NodesActions);
  #hotkeysService = inject(HotkeysService);
  #nodesStore = inject(NodesStore);

  node = input.required<TNode<Panel>>();
  mentions = this.#store.selectSignal(boardPageFeature.selectMentions);

  pasted = input.required<boolean>();

  focus = input.required<boolean>();

  edit = signal(false);
  editText = signal('');
  initialText = signal('');

  get drawing() {
    return this.#drawingStore.drawing;
  }

  activeLayer = computed(() => {
    return this.#nodeStore.layer() === this.node().content.layer;
  });

  @HostListener('dblclick', ['$event'])
  mousedown(event: MouseEvent) {
    if (!this.edit()) {
      event.preventDefault();
      event.stopPropagation();

      this.initEdit();
    }
  }

  constructor() {
    effect(() => {
      this.#setCssVariables(this.node());
    });

    explicitEffect([this.focus], ([focus]) => {
      if (!focus) {
        this.cancelEdit();
      }
    });

    explicitEffect([this.edit], ([edit]) => {
      if (edit) {
        this.#historyService.initEdit(this.node());
      } else {
        this.#historyService.finishEdit(this.node());
      }
    });

    toObservable(this.focus)
      .pipe(
        takeUntilDestroyed(),
        switchMap((focus) => {
          if (focus) {
            return this.#hotkeysService.listen({ key: 'Escape' });
          }
          return [];
        }),
      )
      .subscribe(() => {
        this.edit.set(false);
      });
  }

  initEdit() {
    this.initialText.set(this.node().content.text);
    this.edit.set(true);
    this.editText.set(this.node().content.text);
  }

  setDrawing(newLine: Drawing) {
    this.#drawingStore.actions.setDrawing({
      id: this.node().id,
      type: 'panel',
      drawing: [...this.node().content.drawing, newLine],
      history: true,
    });
  }

  ngOnInit() {
    toObservable(this.node, {
      injector: this.#injector,
    }).subscribe((node) => {
      this.editText.set(node.content.text);
    });

    if (this.focus() && !this.pasted()) {
      this.initEdit();
    }
  }

  setText(value: string) {
    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: false,
        actions: [
          this.#nodesActions.patch<Panel>({
            type: 'panel',
            id: this.node().id,
            content: {
              text: value,
            },
          }),
        ],
      }),
    );
  }

  cancelEdit() {
    if (this.edit()) {
      this.#historyService.finishEdit(this.node());
      this.edit.set(false);
    }
  }

  onMention(userId: string) {
    this.#nodesStore.actions.mentionUser({ userId, nodeId: this.node().id });
  }

  get nativeElement(): HTMLElement {
    return this.#el.nativeElement;
  }

  #setCssVariables(panel: TNode<Panel>) {
    if (panel.content.backgroundColor) {
      this.nativeElement.style.setProperty(
        '--backgroundColor',
        panel.content.backgroundColor,
      );
    } else {
      this.nativeElement.style.removeProperty('--backgroundColor');
    }

    if (panel.content.borderColor) {
      this.nativeElement.style.setProperty(
        '--borderColor',
        panel.content.borderColor,
      );
    } else {
      this.nativeElement.style.removeProperty('--borderColor');
    }

    if (panel.content.borderWidth !== undefined) {
      this.nativeElement.style.setProperty(
        '--borderWidth',
        panel.content.borderWidth + 'px',
      );
    } else {
      this.nativeElement.style.removeProperty('--borderWidth');
    }

    if (panel.content.borderRadius !== undefined) {
      this.nativeElement.style.setProperty(
        '--borderRadius',
        panel.content.borderRadius + 'px',
      );
    } else {
      this.nativeElement.style.removeProperty('--borderRadius');
    }

    if (panel.content.textAlign) {
      this.nativeElement.style.setProperty(
        '--textAlign',
        panel.content.textAlign,
      );
    } else {
      this.nativeElement.style.removeProperty('--textAlign');
    }
  }
}
