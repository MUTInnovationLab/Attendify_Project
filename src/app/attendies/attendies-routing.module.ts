import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AttendiesPage } from './attendies.page';

const routes: Routes = [
  {
    path: '',
    component: AttendiesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AttendiesPageRoutingModule {}
