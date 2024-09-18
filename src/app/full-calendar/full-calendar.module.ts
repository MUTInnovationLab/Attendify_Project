import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FullCalendarPageRoutingModule } from './full-calendar-routing.module';
import { FullCalendarPage } from './full-calendar.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FullCalendarPageRoutingModule
  ],
  declarations: [FullCalendarPage]
})
export class FullCalendarPageModule {}
