import { focustContentEditable } from '../../../../shared/focus-content-editable';

import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  ElementRef,
  HostListener,
  ViewChild,
  signal,
  Injector,
} from '@angular/core';
import { Token, TuNode } from '@tapiz/board-commons';
import { DynamicComponent } from '../node/dynamic-component';
import { Store } from '@ngrx/store';
import { BoardActions } from '../../actions/board.actions';
import { HistoryService } from '../../services/history.service';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Draggable } from '@tapiz/cdk/models/draggable.model';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { NodesActions } from '../../services/nodes-actions';
import { input } from '@angular/core';

@Component({
  selector: 'tapiz-token',
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
  imports: [],
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
  private nodesActions = inject(NodesActions);

  public node = input.required<TuNode<Token>>();
  public pasted = input.required<boolean>();
  public focus = input.required<boolean>();

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

  public preventDrag() {
    return this.edit();
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
          this.nodesActions.patch({
            type: 'token',
            id: this.node().id,
            content: {
              text,
            },
          }),
        ],
      }),
    );
  }

  public preventDelete() {
    return this.edit();
  }
}
