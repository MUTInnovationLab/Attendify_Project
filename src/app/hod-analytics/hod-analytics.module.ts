import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HodAnalyticsPageRoutingModule } from './hod-analytics-routing.module';

import { HodAnalyticsPage } from './hod-analytics.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HodAnalyticsPageRoutingModule
  ],
  declarations: [HodAnalyticsPage]
})
export class HodAnalyticsPageModule {}
