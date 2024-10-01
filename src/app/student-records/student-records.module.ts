import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { StudentRecordsPageRoutingModule } from './student-records-routing.module';

import { StudentRecordsPage } from './student-records.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    StudentRecordsPageRoutingModule
  ],
  declarations: [StudentRecordsPage]
})
export class StudentRecordsPageModule {}
