import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from './service/guard/auth.guard';

const appRoutes: Routes = [
  {
    path: '',
    loadChildren: () => import('./main/main.module').then((m) => m.MainModule),
    canActivate: [PermissionGuard],
    runGuardsAndResolvers: 'always',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule],
  providers: [],
})
export class RoutingModule {}
