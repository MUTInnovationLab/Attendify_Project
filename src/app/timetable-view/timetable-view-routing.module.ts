import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TimetableViewPage } from './timetable-view.page';

const routes: Routes = [
  {
    path: '',
    component: TimetableViewPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TimetableViewPageRoutingModule {}
