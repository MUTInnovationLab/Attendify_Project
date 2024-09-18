import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AttendiesPageRoutingModule } from './attendies-routing.module';

import { AttendiesPage } from './attendies.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AttendiesPageRoutingModule
  ],
  declarations: [AttendiesPage]
})
export class AttendiesPageModule {}
