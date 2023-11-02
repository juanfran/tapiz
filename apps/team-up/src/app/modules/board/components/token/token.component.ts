import { focustContentEditable } from '@/app/shared/focus-content-editable';
import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnInit,
  inject,
  ElementRef,
  HostBinding,
  HostListener,
  ViewChild,
  OnChanges,
  SimpleChanges,
  signal,
} from '@angular/core';
import { Token, TuNode } from '@team-up/board-commons';
import { DynamicComponent } from '../node/dynamic-component';
import { Store } from '@ngrx/store';
import { BoardActions } from '../../actions/board.actions';
import { HistoryService } from '@/app/services/history.service';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Draggable } from '@team-up/cdk/models/draggable.model';

@Component({
  selector: 'team-up-token',
  styleUrls: ['./token.component.scss'],
  template: `
    <div
      class="text"
      *ngIf="!edit()">
      {{ node.content.text }}
    </div>
    <!-- prettier-ignore -->
    <div
      *ngIf="edit()"
      #contenteditable
      (keydown.enter)="enter($event)"
      (input)="setText($event)"
      class="edit"
      contenteditable>{{ editableText }}</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, BoardDragDirective],
  hostDirectives: [BoardDragDirective],
})
export class TokenComponent
  implements OnInit, OnChanges, DynamicComponent, Draggable
{
  @ViewChild('contenteditable') set contenteditable(
    el: ElementRef | undefined
  ) {
    if (el) {
      focustContentEditable(el.nativeElement);
    }
  }

  private el = inject(ElementRef<HTMLElement>);
  private store = inject(Store);
  private historyService = inject(HistoryService);
  private boardDragDirective = inject(BoardDragDirective);

  @Input({ required: true })
  public node!: TuNode<Token>;

  @Input()
  public pasted!: boolean;

  @HostBinding('class.focus')
  @Input()
  public focus!: boolean;

  @Input({ required: true })
  public userId!: string;

  @HostListener('dblclick', ['$event'])
  public mousedown(event: MouseEvent) {
    if (!this.edit()) {
      event.preventDefault();
      event.stopPropagation();
      this.editableText = this.node.content.text;
      this.edit.set(true);
      this.historyService.initEdit(this.node);
    }
  }

  public edit = signal(false);
  public editableText = '';

  public get zIndex() {
    return 5;
  }

  public ngOnInit() {
    this.boardDragDirective.setHost(this);

    this.el.nativeElement.style.setProperty('--color', this.node.content.color);
    this.el.nativeElement.style.setProperty(
      '--bg',
      this.node.content.backgroundColor
    );
  }

  public get nativeElement() {
    return this.el.nativeElement;
  }

  public get preventDrag() {
    return this.edit() || !this.focus;
  }

  public get id() {
    return this.node.id;
  }

  public get nodeType() {
    return this.node.type;
  }

  public get position() {
    return this.node.content.position;
  }

  public enter(event: Event) {
    event.preventDefault();

    this.cancelEdit();
  }

  public cancelEdit() {
    if (this.edit()) {
      this.historyService.finishEdit(this.node);
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
              id: this.node.id,
              content: {
                text,
              },
            },
            op: 'patch',
          },
        ],
      })
    );
  }

  public preventDelete() {
    return this.edit();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['focus'] && !this.focus) {
      this.cancelEdit();
    }
  }
}
