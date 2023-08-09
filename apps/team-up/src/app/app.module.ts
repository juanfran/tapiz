import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './modules/board/components/login/login.component';
import { AuthGuard } from './modules/board/guards/auth.guard';
import { PageNotFoundComponent } from './modules/board/components/page-not-found/page-not-found.component';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatSnackBarModule } from '@angular/material/snack-bar';

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./modules/home/home.routes').then((mod) => mod.homesRoutes),
    canActivate: [AuthGuard],
  },
  {
    path: 'board/:id',
    loadChildren: () =>
      import('./modules/board/board.routes').then((mod) => mod.boardRoutes),
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
    RouterModule.forRoot(routes, { bindToComponentInputs: true }),
    MatSnackBarModule,
  ],
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline', subscriptSizing: 'dynamic' },
    },
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
