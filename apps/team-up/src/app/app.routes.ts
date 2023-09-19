import { Routes } from '@angular/router';
import { LoginComponent } from './modules/board/components/login/login.component';
import { PageNotFoundComponent } from './modules/board/components/page-not-found/page-not-found.component';
import { AuthGuard } from './modules/board/guards/auth.guard';

export const APP_ROUTES: Routes = [
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
