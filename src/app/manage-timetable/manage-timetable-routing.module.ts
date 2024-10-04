import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ManageTimetablePage } from './manage-timetable.page';

const routes: Routes = [
  {
    path: '',
    component: ManageTimetablePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManageTimetablePageRoutingModule {}
