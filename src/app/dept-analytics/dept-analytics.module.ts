import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DeptAnalyticsPageRoutingModule } from './dept-analytics-routing.module';

import { DeptAnalyticsPage } from './dept-analytics.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DeptAnalyticsPageRoutingModule
  ],
  declarations: [DeptAnalyticsPage]
})
export class DeptAnalyticsPageModule {}
