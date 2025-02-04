import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HodAnalyticsPage } from './hod-analytics.page';

const routes: Routes = [
  {
    path: '',
    component: HodAnalyticsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HodAnalyticsPageRoutingModule {}
