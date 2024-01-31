import { focustContentEditable } from '../../../../shared/focus-content-editable';

import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnInit,
  inject,
  ElementRef,
  HostListener,
  ViewChild,
  signal,
  Signal,
  Injector,
} from '@angular/core';
import { Token, TuNode } from '@team-up/board-commons';
import { DynamicComponent } from '../node/dynamic-component';
import { Store } from '@ngrx/store';
import { BoardActions } from '../../actions/board.actions';
import { HistoryService } from '@team-up/nodes/services/history.service';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Draggable } from '@team-up/cdk/models/draggable.model';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
@Component({
  selector: 'team-up-token',
  styleUrls: ['./token.component.scss'],
  template: `
    @if (!edit()) {
      <div class="text">
        {{ node().content.text }}
      </div>
    }
    <!-- prettier-ignore -->
    @if (edit()) {
      <div
        #contenteditable
        (keydown.enter)="enter($event)"
        (input)="setText($event)"
        class="edit"
      contenteditable>{{ editableText }}</div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [BoardDragDirective],
  hostDirectives: [BoardDragDirective],
  host: {
    '[class.focus]': 'focus()',
  },
})
export class TokenComponent implements OnInit, DynamicComponent, Draggable {
  @ViewChild('contenteditable') set contenteditable(
    el: ElementRef | undefined,
  ) {
    if (el) {
      focustContentEditable(el.nativeElement);
    }
  }

  private el = inject(ElementRef<HTMLElement>);
  private store = inject(Store);
  private historyService = inject(HistoryService);
  private boardDragDirective = inject(BoardDragDirective);
  private injector = inject(Injector);

  @Input({ required: true })
  public node!: Signal<TuNode<Token>>;

  @Input()
  public pasted!: Signal<boolean>;

  @Input()
  public focus!: Signal<boolean>;

  @HostListener('dblclick', ['$event'])
  public mousedown(event: MouseEvent) {
    if (!this.edit()) {
      event.preventDefault();
      event.stopPropagation();
      this.editableText = this.node().content.text;
      this.edit.set(true);
      this.historyService.initEdit(this.node());
    }
  }

  public edit = signal(false);
  public editableText = '';

  public get zIndex() {
    return 5;
  }

  public ngOnInit() {
    toObservable(this.focus, {
      injector: this.injector,
    })
      .pipe(filter((it) => !it))
      .subscribe(() => {
        this.cancelEdit();
      });

    this.boardDragDirective.setHost(this);

    this.el.nativeElement.style.setProperty(
      '--color',
      this.node().content.color,
    );
    this.el.nativeElement.style.setProperty(
      '--bg',
      this.node().content.backgroundColor,
    );
  }

  public get nativeElement() {
    return this.el.nativeElement;
  }

  public get preventDrag() {
    return this.edit() || !this.focus();
  }

  public get id() {
    return this.node().id;
  }

  public get nodeType() {
    return this.node().type;
  }

  public get position() {
    return this.node().content.position;
  }

  public enter(event: Event) {
    event.preventDefault();

    this.cancelEdit();
  }

  public cancelEdit() {
    if (this.edit()) {
      this.historyService.finishEdit(this.node());
      this.edit.set(false);
    }
  }

  public setText(event: Event) {
    const text = (event.target as HTMLDivElement).innerText;

    this.store.dispatch(
      BoardActions.batchNodeActions({
        history: false,
        actions: [
          {
            data: {
              type: 'token',
              id: this.node().id,
              content: {
                text,
              },
            },
            op: 'patch',
          },
        ],
      }),
    );
  }

  public preventDelete() {
    return this.edit();
  }
}
