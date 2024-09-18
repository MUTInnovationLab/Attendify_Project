import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ManageAnnouncementsPageRoutingModule } from './manage-announcements-routing.module';

import { ManageAnnouncementsPage } from './manage-announcements.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ManageAnnouncementsPageRoutingModule
  ],
  declarations: [ManageAnnouncementsPage]
})
export class ManageAnnouncementsPageModule {}
