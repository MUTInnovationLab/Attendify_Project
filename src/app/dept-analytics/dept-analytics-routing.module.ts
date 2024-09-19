import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DeptAnalyticsPage } from './dept-analytics.page';

const routes: Routes = [
  {
    path: '',
    component: DeptAnalyticsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DeptAnalyticsPageRoutingModule {}
