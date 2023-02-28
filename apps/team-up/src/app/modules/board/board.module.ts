import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { BoardComponent } from './board/board.component';
import { StoreModule } from '@ngrx/store';
import { boardFeature } from './reducers/board.reducer';
import { EffectsModule } from '@ngrx/effects';
import { BoardEffects } from './effects/board.effects';
import { LetModule } from '@rx-angular/template/let';
import { PushModule } from '@rx-angular/template/push';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { BoardDragDirective } from './directives/board-drag.directive';
import { NoteComponent } from './components/note/note.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { ImageComponent } from './components/image/image.component';
import { UsersComponent } from './components/users/users.component';
import { CursorsComponent } from './components/cursors/cursors.component';
import { GroupComponent } from './components/group/group.component';
import { MatSliderModule } from '@angular/material/slider';
import { MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { SvgIconComponent } from './components/svg-icon/svg-icon.component';

import { ZoneComponent } from './components/zone/zone.component';
import { HistoryEffects } from './effects/history.effects';
import { OverlayComponent } from './components/overlay/overlay.component';
import { HeaderComponent } from './components/header/header.component';
import { PanelsComponent } from './components/panels/panel.component';
import { PanelComponent } from './components/panel/panel.component';
import { LoginComponent } from './components/login/login.component';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BoardListComponent } from './components/board-list/board-list.component';
import { AuthGuard } from './guards/auth.guard';
import { AutoFocusDirective } from './directives/autofocus.directive';
import { ClickOutsideDirective } from './directives/click-outside.directive';
import { TextComponent } from './components/text/text.component';
import { ConfirmComponent } from './components/confirm-action/confirm-actions.component';
import { pageFeature } from './reducers/page.reducer';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';

const routes: Routes = [
  {
    path: '',
    component: BoardListComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'board/:id',
    component: BoardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  { path: '404', component: PageNotFoundComponent },
  { path: '**', pathMatch: 'full', component: PageNotFoundComponent },
];
@NgModule({
  imports: [
    CommonModule,
    LetModule,
    PushModule,
    DragDropModule,
    RouterModule.forRoot(routes),
    StoreModule.forFeature(boardFeature),
    StoreModule.forFeature(pageFeature),
    EffectsModule.forFeature([BoardEffects, HistoryEffects]),
    MatSliderModule,
    MatDialogModule,
    MatInputModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    MatListModule,
  ],
  declarations: [
    BoardComponent,
    BoardListComponent,
    BoardDragDirective,
    NoteComponent,
    ImageComponent,
    TextComponent,
    ToolbarComponent,
    UsersComponent,
    CursorsComponent,
    GroupComponent,
    ZoneComponent,
    OverlayComponent,
    SvgIconComponent,
    HeaderComponent,
    PanelComponent,
    PanelsComponent,
    LoginComponent,
    AutoFocusDirective,
    ClickOutsideDirective,
    ConfirmComponent,
    PageNotFoundComponent,
  ],
  exports: [BoardComponent],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BoardModule {}
