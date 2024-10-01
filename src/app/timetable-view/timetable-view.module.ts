import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TimetableViewPageRoutingModule } from './timetable-view-routing.module';

import { TimetableViewPage } from './timetable-view.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TimetableViewPageRoutingModule
  ],
  declarations: [TimetableViewPage]
})
export class TimetableViewPageModule {}
