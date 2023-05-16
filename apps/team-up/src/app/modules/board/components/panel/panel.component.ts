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
import { first, pluck } from 'rxjs/operators';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Draggable } from '../../models/draggable.model';
import { Panel } from '@team-up/board-commons';
import { BoardMoveService } from '../../services/board-move.service';
import {
  selectCanvasMode,
  selectFocusId,
} from '../../selectors/page.selectors';
import hotkeys from 'hotkeys-js';
import { MoveService } from '../../services/move.service';
import { NgIf, AsyncPipe } from '@angular/common';

interface State {
  edit: boolean;
  panel: Panel;
  editText: string;
  focus: boolean;
  draggable: boolean;
  initDragPosition: Point;
  mode: string;
}
@UntilDestroy()
@Component({
  selector: 'team-up-panel',
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [NgIf, AsyncPipe],
})
export class PanelComponent implements AfterViewInit, OnInit, Draggable {
  @Input()
  public set panel(panel: Panel) {
    this.state.set({ panel });
  }

  @HostBinding('style.width.px') get width() {
    return this.state.get('panel')?.width ?? '0';
  }

  @HostBinding('style.height.px') get height() {
    return this.state.get('panel')?.height ?? '0';
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
    private moveService: MoveService,
    private boardDragDirective: BoardDragDirective,
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
      PageActions.setFocusId({ focusId: this.state.get('panel').id })
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
      editText: this.state.get('panel').title,
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
    return this.state.get('panel').position;
  }

  public get preventDrag() {
    return !this.state.get('draggable');
  }

  public startDrag(position: Point) {
    this.state.set({
      initDragPosition: position,
    });
  }

  public endDrag() {
    this.store.dispatch(
      PageActions.endDragNode({
        nodeType: 'panel',
        id: this.state.get('panel').id,
        initialPosition: this.state.get('initDragPosition'),
        finalPosition: this.state.get('panel').position,
      })
    );
  }

  public move(position: Point) {
    this.store.dispatch(
      BoardActions.patchNode({
        nodeType: 'panel',
        node: {
          id: this.state.get('panel').id,
          position,
        },
      })
    );
  }

  public setText(event: Event) {
    if (event.target) {
      const value = (event.target as HTMLElement).innerText;

      this.store.dispatch(
        BoardActions.patchNode({
          nodeType: 'panel',
          node: {
            id: this.state.get('panel').id,
            title: value,
          },
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
      .pipe(first())
      .subscribe((id) => {
        if (id === this.state.get('panel').id) {
          this.edit();
        }
      });

    this.boardDragDirective.setHost(this);

    this.state
      .select('panel')
      .pipe(pluck('position'), untilDestroyed(this))
      .subscribe((position) => {
        (
          this.el.nativeElement as HTMLElement
        ).style.transform = `translate(${position.x}px, ${position.y}px)`;
      });

    this.state.connect(this.store.select(selectFocusId), (state, focusId) => {
      return {
        focus: focusId === state.panel.id,
      };
    });

    this.state.connect('mode', this.store.select(selectCanvasMode));

    this.state.hold(this.state.select('focus'), (focus) => {
      if (focus && !this.state.get('edit')) {
        hotkeys('delete', this.state.get('panel').id, () => {
          this.store.dispatch(
            BoardActions.removeNode({
              node: this.state.get('panel'),
              nodeType: 'panel',
            })
          );
        });

        hotkeys.setScope(this.state.get('panel').id);
      } else {
        hotkeys.unbind('delete', this.state.get('panel').id);
      }
    });
  }

  public get nativeElement(): HTMLElement {
    return this.el.nativeElement as HTMLElement;
  }

  public focusTextarea() {
    (this.textarea.first.nativeElement as HTMLTextAreaElement).focus();
  }

  public newColor(e: Event) {
    if (e.target) {
      const color = (e.target as HTMLInputElement).value;

      this.store.dispatch(
        BoardActions.patchNode({
          nodeType: 'panel',
          node: {
            id: this.state.get('panel').id,
            color,
          },
        })
      );
    }
  }

  public ngAfterViewInit() {
    if (this.state.get('focus')) {
      (this.textarea.first.nativeElement as HTMLTextAreaElement).focus();
    }

    if (this.resize) {
      this.moveService
        .listenIncrementalAreaSelector(this.resize.nativeElement)
        .pipe()
        .subscribe((size) => {
          if (size) {
            const { width, height } = this.state.get('panel');

            this.store.dispatch(
              BoardActions.patchNode({
                nodeType: 'panel',
                node: {
                  id: this.state.get('panel').id,
                  width: width + size.x,
                  height: height + size.y,
                },
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
