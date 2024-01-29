import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import {
  selectCanvasMode,
  selectIsAdmin,
} from '../../selectors/page.selectors';
import { ExportService } from '../../services/export.service';
import { ClickOutsideDirective } from '@team-up/ui/click-outside/click-outside.directive';
import { AutoFocusDirective } from '../../directives/autofocus.directive';
import { NgIf } from '@angular/common';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { RouterLink } from '@angular/router';
import { RxLet } from '@rx-angular/template/let';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ShareBoardComponent } from '../share-board/share-board.component';
import { pageFeature } from '../../reducers/page.reducer';
import { BoardSettingsComponent } from '../board-settings/board-settings.component';

interface State {
  edit: boolean;
  canvasMode: string;
  name: string;
  isAdmin: boolean;
}
@Component({
  selector: 'team-up-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [
    RxLet,
    RouterLink,
    SvgIconComponent,
    NgIf,
    AutoFocusDirective,
    ClickOutsideDirective,
    MatIconModule,
    MatDialogModule,
  ],
})
export class HeaderComponent {
  constructor(
    private exportService: ExportService,
    private store: Store,
    public state: RxState<State>,
    public cd: ChangeDetectorRef,
    public dialog: MatDialog,
  ) {
    this.state.set({ edit: false });
    this.state.connect('canvasMode', this.store.select(selectCanvasMode));
    this.state.connect('name', this.store.select(pageFeature.selectName));
    this.state.connect('isAdmin', this.store.select(selectIsAdmin));
  }

  public model$ = this.state.select();

  public changeCanvasMode(mode: string) {
    this.store.dispatch(
      PageActions.changeCanvasMode({
        canvasMode: mode,
      }),
    );
  }

  public export() {
    this.exportService.getExportFile().then(
      (url) => {
        window.location.href = url;
      },
      () => {
        console.error('export error');
      },
    );
  }

  public editName() {
    this.state.set({ edit: true });
  }

  public enter(event: Event) {
    event.preventDefault();

    if (event.target) {
      this.state.set({ edit: false });

      const name = (event.target as HTMLTextAreaElement).innerText;
      this.store.dispatch(BoardActions.setBoardName({ name }));
    }
  }

  public clickOutside({ el }: { el: ElementRef }) {
    this.state.set({ edit: false });

    const name = (el.nativeElement as HTMLTextAreaElement).innerText;
    this.store.dispatch(BoardActions.setBoardName({ name }));
  }

  public share() {
    this.dialog.open(ShareBoardComponent, {
      width: '600px',
      autoFocus: 'dialog',
    });
  }

  public settings() {
    this.dialog.open(BoardSettingsComponent, {
      width: '600px',
      autoFocus: 'dialog',
    });
  }
}
