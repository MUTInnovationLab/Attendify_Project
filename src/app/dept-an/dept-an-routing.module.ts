import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DeptAnPage } from './dept-an.page';

const routes: Routes = [
  {
    path: '',
    component: DeptAnPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DeptAnPageRoutingModule {}
