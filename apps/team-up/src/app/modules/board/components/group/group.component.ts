import {
  Component,
  ChangeDetectionStrategy,
  Input,
  HostListener,
  ElementRef,
  QueryList,
  ViewChildren,
  AfterViewInit,
  OnInit,
  HostBinding,
  ChangeDetectorRef,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { filter, first, map, withLatestFrom } from 'rxjs/operators';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Draggable } from '../../models/draggable.model';
import { Group, NodeType, TuNode } from '@team-up/board-commons';
import { BoardMoveService } from '../../services/board-move.service';
import { selectFocusId } from '../../selectors/page.selectors';
import hotkeys from 'hotkeys-js';
import { NgIf, AsyncPipe } from '@angular/common';
import { pageFeature } from '../../reducers/page.reducer';
import { Resizable } from '../../models/resizable.model';
import { ResizableDirective } from '../../directives/resize.directive';
import { ResizeHandlerDirective } from '../../directives/resize-handler.directive';

interface State {
  edit: boolean;
  group: TuNode<Group>;
  editText: string;
  focus: boolean;
  draggable: boolean;
  highlight: boolean;
  voting: boolean;
  userId: string;
}
@UntilDestroy()
@Component({
  selector: 'team-up-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [NgIf, AsyncPipe, ResizeHandlerDirective],
})
export class GroupComponent
  implements AfterViewInit, OnInit, Draggable, Resizable
{
  @Input()
  public set group(group: TuNode<Group>) {
    this.state.set({ group });
  }

  @HostBinding('style.width.px') get width() {
    return this.state.get('group')?.content.width ?? '0';
  }

  @HostBinding('style.height.px') get height() {
    return this.state.get('group')?.content.height ?? '0';
  }

  @HostBinding('class.focus') get focus() {
    return this.state.get('focus');
  }

  @HostBinding('class.highlight') get highlight() {
    return this.state.get('highlight');
  }

  @HostBinding('class.voting') get voting() {
    return this.state.get('voting');
  }

  public readonly viewModel$ = this.state.select().pipe(
    map((state) => {
      return {
        ...state,
        votes: state.group.content.votes.reduce((prev, it) => {
          return prev + it.vote;
        }, 0),
      };
    })
  );

  @ViewChildren('textarea') textarea!: QueryList<ElementRef>;

  constructor(
    private el: ElementRef,
    private boardMoveService: BoardMoveService,
    private state: RxState<State>,
    private store: Store,
    private boardDragDirective: BoardDragDirective,
    private resizableDirective: ResizableDirective,
    private cd: ChangeDetectorRef
  ) {
    this.state.connect('voting', this.store.select(pageFeature.selectVoting));
    this.state.connect('userId', this.store.select(pageFeature.selectUserId));

    this.state.set({ draggable: true });

    this.state.hold(this.state.select('focus'), () => this.cd.markForCheck());
    this.state.hold(this.state.select('edit'), (edit) =>
      this.state.set({ draggable: !edit })
    );
  }

  @HostListener('mousedown', ['$event'])
  public mousedown(event: MouseEvent) {
    // prevent select word on dblclick
    if (!this.state.get('edit')) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.state.get('voting')) {
      let votes = this.state.get('group').content.votes;

      let currentUserVote = votes.find(
        (vote) => vote.userId === this.state.get('userId')
      );

      if (currentUserVote) {
        votes = votes.map((vote) => {
          if (vote.userId === this.state.get('userId')) {
            return {
              ...vote,
              vote: event.button === 2 ? vote.vote - 1 : vote.vote + 1,
            };
          }

          return vote;
        });
      } else {
        votes = [
          ...votes,
          {
            userId: this.state.get('userId'),
            vote: event.button === 2 ? -1 : 1,
          },
        ];
      }

      currentUserVote = votes.find(
        (vote) => vote.userId === this.state.get('userId')
      );

      votes = votes.filter((vote) => vote.vote !== 0);

      if (currentUserVote && currentUserVote.vote >= 0) {
        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions: [
              {
                data: {
                  type: 'group',
                  id: this.state.get('group').id,
                  content: {
                    votes,
                  },
                },
                op: 'patch',
              },
            ],
          })
        );
      }
    } else {
      this.store.dispatch(
        PageActions.setFocusId({
          focusId: this.state.get('group').id,
          ctrlKey: event.ctrlKey,
        })
      );
    }
  }

  @HostListener('dblclick', ['$event'])
  public dblclick(event: MouseEvent) {
    if (this.state.get('voting')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.edit();
    requestAnimationFrame(() => {
      this.focusTextarea();
    });
  }

  public edit() {
    this.state.set({
      edit: true,
      editText: this.state.get('group').content.title,
    });

    this.state.connect(
      this.boardMoveService.mouseDown$.pipe(first()),
      (state) => {
        return {
          ...state,
          edit: false,
        };
      }
    );
  }

  public get position() {
    return this.state.get('group').content.position;
  }

  public get preventDrag() {
    return !this.state.get('draggable') || !this.state.get('focus');
  }

  public enter(event: Event) {
    event.preventDefault();

    (this.textarea.first.nativeElement as HTMLTextAreaElement).blur();
    this.store.dispatch(PageActions.setFocusId({ focusId: '' }));
  }

  public setText(event: Event) {
    if (event.target) {
      const value = (event.target as HTMLElement).innerText;

      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: true,
          actions: [
            {
              data: {
                type: 'group',
                id: this.state.get('group').id,
                content: {
                  title: value.trim(),
                },
              },
              op: 'patch',
            },
          ],
        })
      );
    }
  }

  public selectElementContents(el: HTMLElement) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();

    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  public selectTextarea($event: FocusEvent) {
    this.selectElementContents($event.target as HTMLElement);
  }

  public ngOnInit() {
    this.store
      .select(selectFocusId)
      .pipe(
        first(),
        withLatestFrom(
          this.store.select(pageFeature.selectAdditionalContext),
          this.state.select('group').pipe(map((group) => group.id))
        ),
        filter(([id, context, groupId]) => {
          return id.includes(groupId) && context[groupId] !== 'pasted';
        }),
        untilDestroyed(this)
      )
      .subscribe(() => {
        this.edit();
      });

    this.boardDragDirective.setHost(this);
    this.resizableDirective.setHost(this);

    this.state
      .select('group')
      .pipe(untilDestroyed(this))
      .subscribe((group) => {
        (
          this.el.nativeElement as HTMLElement
        ).style.transform = `translate(${group.content.position.x}px, ${group.content.position.y}px)`;
      });

    this.state.connect(this.store.select(selectFocusId), (state, focusId) => {
      return {
        focus: focusId.includes(state.group.id),
      };
    });

    this.state.connect(
      'highlight',
      this.store
        .select(pageFeature.selectShowUserVotes)
        .pipe(
          map((userVotes) => {
            return !!this.state
              .get('group')
              .content.votes.find((vote) => vote.userId === userVotes);
          })
        )
        .pipe(
          map((highlight) => {
            return highlight;
          })
        )
    );

    hotkeys('delete', () => {
      if (this.state.get('focus')) {
        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions: [
              {
                data: {
                  type: 'group',
                  id: this.state.get('group').id,
                },
                op: 'remove',
              },
            ],
          })
        );
      }
    });
  }

  public nodeType: NodeType = 'group';

  public get id() {
    return this.state.get('group').id;
  }

  public get nativeElement(): HTMLElement {
    return this.el.nativeElement as HTMLElement;
  }

  public focusTextarea() {
    if (this.textarea.first) {
      (this.textarea.first.nativeElement as HTMLTextAreaElement).focus();
    }
  }

  public ngAfterViewInit() {
    if (this.state.get('focus')) {
      this.focusTextarea();
    }
  }
}
