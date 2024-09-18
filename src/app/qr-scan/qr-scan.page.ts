import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as QRCode from 'qrcode';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';


@Component({
  selector: 'app-qr-scan',
  templateUrl: './qr-scan.page.html',
  styleUrls: ['./qr-scan.page.scss'],
})
export class QrScanPage implements OnInit {

  qrCodeDataUrl: string = 'CF100';
  qrCodeText: string = '';
  qrCodeSize: number = 200;
  scannedResult: any;
  content_visibility = '';
  moduleCode: string = '';

  constructor(private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['moduleCode']) {
        this.moduleCode = params['moduleCode'];
        this.generateQRCode(); // Initial QR code generation
        this.startQRCodeUpdate(); // Start the interval for QR code update
      }
    });
  }

  startQRCodeUpdate() {
    // Update the QR code every 5 seconds
    setInterval(() => {
      this.generateQRCode();
      this.cdr.detectChanges(); // Trigger change detection
    }, 5000);
  }
  

  async generateQRCode() {
    try {
      this.qrCodeText = this.moduleCode + '-' + Date.now().toString();
      this.qrCodeDataUrl = await QRCode.toDataURL(this.qrCodeText, {
        width: this.qrCodeSize,
        margin: 1,
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

}
