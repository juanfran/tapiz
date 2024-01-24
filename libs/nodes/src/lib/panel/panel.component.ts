import {
  Component,
  ChangeDetectionStrategy,
  Input,
  ElementRef,
  OnInit,
  HostBinding,
  HostListener,
  Signal,
  signal,
  inject,
  Injector,
  effect,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { Panel, TuNode } from '@team-up/board-commons';
import { HotkeysService } from '@team-up/cdk/services/hostkeys.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { BoardActions } from '@team-up/board-commons/actions/board.actions';
import { HistoryService } from '../services/history.service';
import { NodeSpaceComponent } from '../node-space';
import { ToolbarComponent } from '@team-up/ui/toolbar';
import { EditorViewComponent } from '@team-up/ui/editor-view';
import { filter, pairwise } from 'rxjs';
import { SafeHtmlPipe } from '@team-up/cdk/pipes/safe-html';

@Component({
  selector: 'team-up-panel',
  template: `
    <team-up-node-space
      [node]="node()"
      [resize]="true"
      [rotate]="true"
      [enabled]="!edit() && focus()">
      <div class="editor-wrapper">
        <team-up-editor-view
          #editorView="editorView"
          [class.readonly]="!edit()"
          [node]="node()"
          [toolbar]="edit()"
          [layoutToolbarOptions]="true"
          [content]="node().content.text"
          [focus]="edit()"
          (contentChange)="newContent.set($event)" />
      </div>
    </team-up-node-space>
  `,
  styleUrls: ['./panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState, HotkeysService],
  standalone: true,
  imports: [
    NodeSpaceComponent,
    ToolbarComponent,
    EditorViewComponent,
    SafeHtmlPipe,
  ],
  host: {
    '[class.focus]': 'focus()',
    '[class.toolbar]': 'edit()',
  },
})
export class PanelComponent implements OnInit {
  private injector = inject(Injector);
  private historyService = inject(HistoryService);
  private el = inject(ElementRef);
  private store = inject(Store);

  @Input({ required: true })
  public node!: Signal<TuNode<Panel>>;

  @Input()
  public pasted!: Signal<boolean>;

  @Input({ required: true })
  public focus!: Signal<boolean>;

  public edit = signal(false);
  public editText = signal('');
  public newContent = signal('');

  @HostBinding('class') get layer() {
    return `layer-${this.node().content.layer}`;
  }

  public get zIndex() {
    return 2;
  }

  @HostListener('dblclick', ['$event'])
  public mousedown(event: MouseEvent) {
    if (!this.edit()) {
      event.preventDefault();
      event.stopPropagation();

      this.startEdit();
    }
  }

  constructor() {
    effect(() => {
      this.setCssVariables(this.node());
    });
  }

  public startEdit() {
    this.historyService.initEdit(this.node());
    this.edit.set(true);
    this.newContent.set(this.node().content.text);
  }

  public newColor(e: Event) {
    if (e.target) {
      const color = (e.target as HTMLInputElement).value;

      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: true,
          actions: [
            {
              data: {
                type: 'text',
                id: this.node().id,
                content: {
                  color,
                },
              },
              op: 'patch',
            },
          ],
        }),
      );
    }
  }

  public newSize(e: Event) {
    if (e.target) {
      const size = Number((e.target as HTMLInputElement).value);

      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: true,
          actions: [
            {
              data: {
                type: 'text',
                id: this.node().id,
                content: {
                  size,
                },
              },
              op: 'patch',
            },
          ],
        }),
      );
    }
  }

  public ngOnInit() {
    toObservable(this.node, {
      injector: this.injector,
    }).subscribe((node) => {
      this.editText.set(node.content.text);
    });

    const focus$ = toObservable(this.focus, {
      injector: this.injector,
    });

    focus$
      .pipe(
        pairwise(),
        filter(([prev, next]) => prev && !next),
      )
      .subscribe(() => {
        if (!this.focus() && this.edit()) {
          this.store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type: 'text',
                    id: this.node().id,
                    content: {
                      text: this.newContent(),
                    },
                  },
                  op: 'patch',
                },
              ],
            }),
          );

          this.cancelEdit();
        }
      });

    if (this.focus() && !this.pasted()) {
      this.startEdit();
    }
  }

  public cancelEdit() {
    if (this.edit()) {
      this.historyService.finishEdit(this.node());
      this.edit.set(false);
    }
  }

  public get nativeElement(): HTMLElement {
    return this.el.nativeElement as HTMLElement;
  }

  private setCssVariables(panel: TuNode<Panel>) {
    if (panel.content.backgroundColor) {
      this.nativeElement.style.setProperty(
        '--backgroundColor',
        panel.content.backgroundColor,
      );
    }

    if (panel.content.borderColor) {
      this.nativeElement.style.setProperty(
        '--borderColor',
        panel.content.borderColor,
      );
    }

    if (panel.content.borderWidth) {
      this.nativeElement.style.setProperty(
        '--borderWidth',
        panel.content.borderWidth + 'px',
      );
    }

    if (panel.content.borderRadius) {
      this.nativeElement.style.setProperty(
        '--borderRadius',
        panel.content.borderRadius + 'px',
      );
    }

    if (panel.content.textAlign) {
      this.nativeElement.style.setProperty(
        '--textAlign',
        panel.content.textAlign,
      );
    }
  }
}
