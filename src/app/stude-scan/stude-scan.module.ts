import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZXingScannerModule } from '@zxing/ngx-scanner';

import { IonicModule } from '@ionic/angular';

import { StudeScanPageRoutingModule } from './stude-scan-routing.module';

import { StudeScanPage } from './stude-scan.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ZXingScannerModule,
    StudeScanPageRoutingModule
  ],
  declarations: [StudeScanPage]
})
export class StudeScanPageModule {}
