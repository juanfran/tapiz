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
} from '@angular/core';
import { Token, TuNode } from '@team-up/board-commons';
import { DynamicComponent } from '../node/dynamic-component';
import { Store } from '@ngrx/store';
import { BoardActions } from '../../actions/board.actions';

@Component({
  selector: 'team-up-token',
  styleUrls: ['./token.component.scss'],
  template: `
    <div
      class="text"
      *ngIf="!edit">
      {{ node.content.text }}
    </div>
    <!-- prettier-ignore -->
    <div
      *ngIf="edit"
      #contenteditable
      (keydown.enter)="enter($event)"
      (input)="setText($event)"
      class="edit"
      contenteditable="plaintext-only">{{ editableText }}</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
})
export class TokenComponent implements OnInit, OnChanges, DynamicComponent {
  @ViewChild('contenteditable') set contenteditable(
    el: ElementRef | undefined
  ) {
    if (el) {
      focustContentEditable(el.nativeElement);
    }
  }

  private el = inject(ElementRef<HTMLElement>);
  private store = inject(Store);

  @Input({ required: true })
  public node!: TuNode<Token>;

  @Input()
  public pasted!: boolean;

  @HostBinding('class.focus')
  @Input()
  public focus!: boolean;

  @HostListener('dblclick', ['$event'])
  public mousedown(event: MouseEvent) {
    if (!this.edit) {
      event.preventDefault();
      event.stopPropagation();
      this.editableText = this.node.content.text;
      this.edit = true;
    }
  }

  public edit = false;
  public editableText = '';

  public get zIndex() {
    return 5;
  }

  public ngOnInit() {
    this.el.nativeElement.style.setProperty('--color', this.node.content.color);
    this.el.nativeElement.style.setProperty(
      '--bg',
      this.node.content.backgroundColor
    );
  }

  public enter(event: Event) {
    event.preventDefault();

    this.edit = false;
  }

  public setText(event: Event) {
    const text = (event.target as HTMLDivElement).innerText;

    this.store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
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
    return this.edit;
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['focus'] && !this.focus) {
      this.edit = false;
    }
  }
}
