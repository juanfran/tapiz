import {
  Component,
  ChangeDetectionStrategy,
  Input,
  HostListener,
  ElementRef,
  OnInit,
  HostBinding,
  ChangeDetectorRef,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { filter, first, map, pluck, withLatestFrom } from 'rxjs/operators';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Draggable } from '../../models/draggable.model';
import { NodeType, Panel } from '@team-up/board-commons';
import {
  selectCanvasMode,
  selectFocusId,
} from '../../selectors/page.selectors';
import hotkeys from 'hotkeys-js';
import { NgIf, AsyncPipe } from '@angular/common';
import { pageFeature } from '../../reducers/page.reducer';
import { Resizable } from '../../models/resizable.model';
import { ResizeHandlerDirective } from '../../directives/resize-handler.directive';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ResizableDirective } from '../../directives/resize.directive';

interface State {
  panel: Panel;
  focus: boolean;
  draggable: boolean;
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
  imports: [NgIf, AsyncPipe, MatIconModule, ResizeHandlerDirective],
})
export class PanelComponent implements OnInit, Draggable, Resizable {
  @Input()
  public set panel(panel: Panel) {
    this.state.set({ panel });
    this.setCssVariables();
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

  public nodeType: NodeType = 'panel';

  public get id() {
    return this.state.get('panel').id;
  }

  constructor(
    private el: ElementRef,
    private state: RxState<State>,
    private store: Store,
    private boardDragDirective: BoardDragDirective,
    private resizableDirective: ResizableDirective,
    private cd: ChangeDetectorRef,
    private dialog: MatDialog
  ) {
    this.state.set({ draggable: true });

    this.state.hold(this.state.select('focus'), () => this.cd.markForCheck());
  }

  @HostListener('mousedown', ['$event'])
  public mousedown(event: MouseEvent) {
    this.store.dispatch(
      PageActions.setFocusId({
        focusId: this.state.get('panel').id,
        ctrlKey: event.ctrlKey,
      })
    );
  }

  public get position() {
    return this.state.get('panel').position;
  }

  public get preventDrag() {
    return !this.state.get('draggable') || !this.state.get('focus');
  }

  public ngOnInit() {
    this.store
      .select(selectFocusId)
      .pipe(
        first(),
        withLatestFrom(
          this.store.select(pageFeature.selectAdditionalContext),
          this.state.select('panel').pipe(map((panel) => panel.id))
        ),
        filter(([id, context, panelId]) => {
          return id.includes(panelId) && context[panelId] !== 'pasted';
        }),
        untilDestroyed(this)
      )
      .subscribe(() => {
        this.openSettings();
      });

    this.boardDragDirective.setHost(this);
    this.resizableDirective.setHost(this);

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
        focus: focusId.includes(state.panel.id),
      };
    });

    this.state.connect('mode', this.store.select(selectCanvasMode));

    hotkeys('delete', () => {
      if (this.state.get('focus')) {
        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions: [
              {
                data: {
                  type: 'panel',
                  node: this.state.get('panel'),
                },
                op: 'remove',
              },
            ],
          })
        );
      }
    });
  }

  public get nativeElement(): HTMLElement {
    return this.el.nativeElement as HTMLElement;
  }

  public async openSettings() {
    const m = await import('../panel-settings/panel-settings.component');

    const dialogRef = this.dialog.open(m.PanelSettingsComponent, {
      data: {
        panel: this.state.get('panel'),
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }

      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: true,
          actions: [
            {
              data: {
                type: 'panel',
                node: {
                  id: this.state.get('panel').id,
                  ...result,
                },
              },
              op: 'patch',
            },
          ],
        })
      );
    });
  }

  private setCssVariables() {
    const panel = this.state.get('panel');

    if (!panel) {
      return;
    }

    if (panel.backgroundColor) {
      this.nativeElement.style.setProperty(
        '--backgroundColor',
        panel.backgroundColor
      );
    }

    if (panel.fontColor) {
      this.nativeElement.style.setProperty('--fontColor', panel.fontColor);
    }

    if (panel.fontSize) {
      this.nativeElement.style.setProperty('--fontSize', panel.fontSize + 'px');
    }

    if (panel.borderColor) {
      this.nativeElement.style.setProperty('--borderColor', panel.borderColor);
    }

    if (panel.borderWidth) {
      this.nativeElement.style.setProperty(
        '--borderWidth',
        panel.borderWidth + 'px'
      );
    }

    if (panel.borderRadius) {
      this.nativeElement.style.setProperty(
        '--borderRadius',
        panel.borderRadius + 'px'
      );
    }
  }
}
