import { Point } from '@angular/cdk/drag-drop';
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
  ViewChild,
  ApplicationRef,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { filter, first, map, withLatestFrom } from 'rxjs/operators';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Draggable } from '../../models/draggable.model';
import { Group, NodeType } from '@team-up/board-commons';
import { BoardMoveService } from '../../services/board-move.service';
import { selectFocusId } from '../../selectors/page.selectors';
import hotkeys from 'hotkeys-js';
import { MoveService } from '../../services/move.service';
import { NgIf, AsyncPipe } from '@angular/common';
import { pageFeature } from '../../reducers/page.reducer';

interface State {
  edit: boolean;
  group: Group;
  editText: string;
  focus: boolean;
  draggable: boolean;
}
@UntilDestroy()
@Component({
  selector: 'team-up-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [NgIf, AsyncPipe],
})
export class GroupComponent implements AfterViewInit, OnInit, Draggable {
  @Input()
  public set group(group: Group) {
    this.state.set({ group });
  }

  @HostBinding('style.width.px') get width() {
    return this.state.get('group')?.width ?? '0';
  }

  @HostBinding('style.height.px') get height() {
    return this.state.get('group')?.height ?? '0';
  }

  @HostBinding('class.focus') get focus() {
    return this.state.get('focus');
  }

  public readonly viewModel$ = this.state.select();

  @ViewChildren('textarea') textarea!: QueryList<ElementRef>;

  @ViewChild('resize') resize!: ElementRef;

  constructor(
    private el: ElementRef,
    private boardMoveService: BoardMoveService,
    private state: RxState<State>,
    private store: Store,
    private boardDragDirective: BoardDragDirective,
    private moveService: MoveService,
    private cd: ChangeDetectorRef,
    private appRef: ApplicationRef
  ) {
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

    this.store.dispatch(
      PageActions.setFocusId({
        focusId: this.state.get('group').id,
        ctrlKey: event.ctrlKey,
      })
    );
  }

  @HostListener('dblclick', ['$event'])
  public dblclick(event: MouseEvent) {
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
      editText: this.state.get('group').title,
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
    return this.state.get('group').position;
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
                node: {
                  id: this.state.get('group').id,
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

    this.state
      .select('group')
      .pipe(untilDestroyed(this))
      .subscribe((group) => {
        (
          this.el.nativeElement as HTMLElement
        ).style.transform = `translate(${group.position.x}px, ${group.position.y}px)`;
      });

    this.state.connect(this.store.select(selectFocusId), (state, focusId) => {
      return {
        focus: focusId.includes(state.group.id),
      };
    });

    hotkeys('delete', () => {
      if (this.state.get('focus')) {
        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions: [
              {
                data: {
                  type: 'group',
                  node: this.state.get('group'),
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

    if (this.resize) {
      this.moveService
        .listenIncrementalAreaSelector(this.resize.nativeElement)
        .subscribe((size) => {
          if (size) {
            const { width, height } = this.state.get('group');

            this.store.dispatch(
              BoardActions.batchNodeActions({
                history: true,
                actions: [
                  {
                    data: {
                      type: 'group',
                      node: {
                        id: this.state.get('group').id,
                        width: width + size.x,
                        height: height + size.y,
                      },
                    },
                    op: 'patch',
                  },
                ],
              })
            );

            this.appRef.tick();
          } else {
            this.state.set({ draggable: true });
          }
        });
    }
  }
}
