import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ViewAnnouncementsComponent } from './view-announcements.component';

@NgModule({
  declarations: [ViewAnnouncementsComponent],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [ViewAnnouncementsComponent]
})
export class AnnouncementsModule { }
