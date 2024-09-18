import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DeptAddPageRoutingModule } from './dept-add-routing.module';

import { DeptAddPage } from './dept-add.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DeptAddPageRoutingModule
  ],
  declarations: [DeptAddPage]
})
export class DeptAddPageModule {}
