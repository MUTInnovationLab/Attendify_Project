import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DeptAddPage } from './dept-add.page';

const routes: Routes = [
  {
    path: '',
    component: DeptAddPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DeptAddPageRoutingModule {}
