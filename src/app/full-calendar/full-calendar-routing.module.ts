import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FullCalendarPage } from './full-calendar.page';

const routes: Routes = [
  {
    path: '',
    component: FullCalendarPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FullCalendarPageRoutingModule {}
