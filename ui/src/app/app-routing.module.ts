import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'search', loadChildren: () => import('./pages/search/search.module').then(m => m.SearchPageModule) },
  { path: 'search/explore/:exploreId', loadChildren: () => import('./pages/search/search.module').then(m => m.SearchPageModule) },
  { path: 'search/train/:trainId', loadChildren: () => import('./pages/search/search.module').then(m => m.SearchPageModule) },
  { path: 'search/status/:statusId/:taskId', loadChildren: () => import('./pages/search/search.module').then(m => m.SearchPageModule) },
  { path: 'search/result/:resultId', loadChildren: () => import('./pages/search/search.module').then(m => m.SearchPageModule) },
  { path: 'model/:id', loadChildren: () => import('./pages/run-model/run-model.module').then(m => m.RunModelPageModule) },
  { path: '**', redirectTo: 'search' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
