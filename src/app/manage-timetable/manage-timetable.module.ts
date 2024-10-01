import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ManageTimetablePageRoutingModule } from './manage-timetable-routing.module';

import { ManageTimetablePage } from './manage-timetable.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ManageTimetablePageRoutingModule
  ],
  declarations: [ManageTimetablePage]
})
export class ManageTimetablePageModule {}
