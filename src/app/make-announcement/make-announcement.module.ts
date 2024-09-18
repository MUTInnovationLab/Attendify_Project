import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { MakeAnnouncementComponent } from './make-announcement.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ],
  declarations: [MakeAnnouncementComponent],
  exports: [MakeAnnouncementComponent]
})
export class MakeAnnouncementModule { }
