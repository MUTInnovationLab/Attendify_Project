import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { StudentRecordsPage } from './student-records.page';

const routes: Routes = [
  {
    path: '',
    component: StudentRecordsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StudentRecordsPageRoutingModule {}
