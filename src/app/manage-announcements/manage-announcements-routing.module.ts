import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ManageAnnouncementsPage } from './manage-announcements.page';

const routes: Routes = [
  {
    path: '',
    component: ManageAnnouncementsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManageAnnouncementsPageRoutingModule {}
