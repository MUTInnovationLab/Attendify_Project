import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DeptProfilePageRoutingModule } from './dept-profile-routing.module';

import { DeptProfilePage } from './dept-profile.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DeptProfilePageRoutingModule
  ],
  declarations: [DeptProfilePage]
})
export class DeptProfilePageModule {}
