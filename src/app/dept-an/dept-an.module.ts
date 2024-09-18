import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DeptAnPageRoutingModule } from './dept-an-routing.module';

import { DeptAnPage } from './dept-an.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DeptAnPageRoutingModule
  ],
  declarations: [DeptAnPage]
})
export class DeptAnPageModule {}
