import {
  Component,
  ChangeDetectionStrategy,
  Input,
  ElementRef,
  OnInit,
  ViewChild,
  HostBinding,
  HostListener,
  Signal,
  signal,
  effect,
  inject,
  Injector,
  AfterViewInit,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { Text, TuNode } from '@team-up/board-commons';
import { HotkeysService } from '@team-up/cdk/services/hostkeys.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { BoardActions } from '@team-up/board-commons/actions/board.actions';
import { HistoryService } from '../services/history.service';
import { NodeSpaceComponent } from '@team-up/ui/node-space';
import { filter, pairwise } from 'rxjs';

@Component({
  selector: 'team-up-text',
  template: `
    <team-up-node-space
      [node]="node()"
      [resize]="true"
      [rotate]="true"
      [enabled]="!edit() && focus()">
      @if (edit()) {
        <div class="toolbar">
          <input
            type="color"
            [value]="node().content.color"
            (change)="newColor($event)" />

          <input
            type="number"
            [value]="node().content.size"
            (change)="newSize($event)" />
        </div>
        <span
          #textarea
          class="textarea text"
          role="textbox"
          contenteditable
          >{{ editText() }}</span
        >
      } @else {
        <span class="readonly text">{{ editText() }}</span>
      }
    </team-up-node-space>
  `,
  styleUrls: ['./text.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState, HotkeysService],
  standalone: true,
  imports: [NodeSpaceComponent],
  host: {
    '[class.focus]': 'focus()',
    '[class.toolbar]': 'edit()',
  },
})
export class TextComponent implements OnInit, AfterViewInit {
  private injector = inject(Injector);
  private historyService = inject(HistoryService);
  private el = inject(ElementRef);
  private store = inject(Store);

  @Input({ required: true })
  public node!: Signal<TuNode<Text>>;

  @Input()
  public pasted!: Signal<boolean>;

  @Input({ required: true })
  public focus!: Signal<boolean>;

  public edit = signal(false);
  public editText = signal('');

  @HostBinding('class') get layer() {
    return `layer-${this.node().content.layer}`;
  }

  @ViewChild('textarea') textarea?: ElementRef<HTMLTextAreaElement>;

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
      this.el.nativeElement.style.setProperty(
        '--size',
        `${this.node().content.size}px`,
      );
      this.el.nativeElement.style.setProperty(
        '--color',
        this.node().content.color,
      );
    });
  }

  public startEdit() {
    this.historyService.initEdit(this.node());
    this.edit.set(true);
  }

  public focusTextarea() {
    if (this.textarea?.nativeElement) {
      (this.textarea.nativeElement as HTMLTextAreaElement).focus();
    }
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
        if (!this.focus() && this.textarea) {
          const value = this.textarea.nativeElement.innerText.trim();

          this.store.dispatch(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type: 'text',
                    id: this.node().id,
                    content: {
                      text: value,
                    },
                  },
                  op: 'patch',
                },
              ],
            }),
          );

          this.editText.set(value);
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

  public ngAfterViewInit(): void {
    if (this.focus()) {
      this.focusTextarea();
    }
  }
}
