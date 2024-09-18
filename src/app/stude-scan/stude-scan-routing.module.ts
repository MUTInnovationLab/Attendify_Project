import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { StudeScanPage } from './stude-scan.page';

const routes: Routes = [
  {
    path: '',
    component: StudeScanPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StudeScanPageRoutingModule {}
