import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DeptProfilePage } from './dept-profile.page';

const routes: Routes = [
  {
    path: '',
    component: DeptProfilePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DeptProfilePageRoutingModule {}
