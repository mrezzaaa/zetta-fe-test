import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './main.component';

const menuRoutes: Routes = [
  {
    path: 'test-correction',
    loadChildren: () => import('../test-correction/test-correction.module').then((m) => m.TestCorrectionModule),
  },
];

const routes: Routes = [
  {
    path: '',
    component: MainComponent,
    children: [...menuRoutes],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainRoutingModule {}
