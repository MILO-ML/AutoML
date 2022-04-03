import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard, redirectUnauthorizedTo, redirectLoggedInTo } from '@angular/fire/auth-guard';

import { environment } from '../environments/environment';

const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['sign-in', { redirectTo: location.pathname }]);
const redirectAuthorizedToHome = () => redirectLoggedInTo(['/']);

const routes: Routes = [
  {
    path: 'sign-in',
    ...(environment.localUser ? {} : { canActivate: [AuthGuard] }),
    data: { authGuardPipe: redirectAuthorizedToHome },
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'sign-up',
    ...(environment.localUser ? {} : { canActivate: [AuthGuard] }),
    data: { authGuardPipe: redirectAuthorizedToHome },
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'sign-out',
    ...(environment.localUser ? {} : { canActivate: [AuthGuard] }),
    data: { authGuardPipe: redirectAuthorizedToHome },
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'forgot-password',
    ...(environment.localUser ? {} : { canActivate: [AuthGuard] }),
    data: { authGuardPipe: redirectAuthorizedToHome },
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'auth/continue',
    ...(environment.localUser ? {} : { canActivate: [AuthGuard] }),
    data: { authGuardPipe: redirectAuthorizedToHome },
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'check-email',
    ...(environment.localUser ? {} : { canActivate: [AuthGuard] }),
    data: { authGuardPipe: redirectAuthorizedToHome },
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'search',
    ...(environment.localUser ? {} : { canActivate: [AuthGuard] }),
    data: { authGuardPipe: redirectUnauthorizedToLogin },
    loadChildren: () => import('./pages/search/search.module').then(m => m.SearchPageModule)
  },
  {
    path: 'search/:dataId/:step',
    ...(environment.localUser ? {} : { canActivate: [AuthGuard] }),
    data: { authGuardPipe: redirectUnauthorizedToLogin },
    loadChildren: () => import('./pages/search/search.module').then(m => m.SearchPageModule)
  },
  {
    path: 'search/:dataId/job/:jobId/:step',
    ...(environment.localUser ? {} : { canActivate: [AuthGuard] }),
    data: { authGuardPipe: redirectUnauthorizedToLogin },
    loadChildren: () => import('./pages/search/search.module').then(m => m.SearchPageModule)
  },
  {
    path: 'search/:dataId/job/:jobId/:step/:taskId/status',
    ...(environment.localUser ? {} : { canActivate: [AuthGuard] }),
    data: { authGuardPipe: redirectUnauthorizedToLogin },
    loadChildren: () => import('./pages/search/search.module').then(m => m.SearchPageModule)
  },
  {
    path: 'model/:id',
    ...(environment.localUser ? {} : { canActivate: [AuthGuard] }),
    data: { authGuardPipe: redirectUnauthorizedToLogin },
    loadChildren: () => import('./pages/run-model/run-model.module').then(m => m.RunModelPageModule)
  },
  {
    path: 'update-license',
    loadChildren: () => import('./pages/update-license/update-license.module').then(m => m.UpdateLicensePageModule)
  },
  {
    path: 'home',
    ...(environment.localUser ? {} : { canActivate: [AuthGuard] }),
    data: { authGuardPipe: redirectUnauthorizedToLogin },
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule)
  },
  { path: '**', redirectTo: environment.name === 'docker' ? 'home' : 'search' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules, relativeLinkResolution: 'legacy' })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
