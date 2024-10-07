import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as QRCode from 'qrcode';
import { AngularFirestore } from '@angular/fire/compat/firestore';

// Define the structure of your module document
interface Module {
  moduleCode: string;
  moduleLevel: string;
  moduleName: string;
  userEmail: string;
  scannerOpenCount?: number; // Optional property for tracking scanner opens
}

@Component({
  selector: 'app-qr-scan',
  templateUrl: './qr-scan.page.html',
  styleUrls: ['./qr-scan.page.scss'],
})
export class QrScanPage implements OnInit {

  qrCodeDataUrl: string = '';
  qrCodeText: string = '';
  qrCodeSize: number = 200;
  scannedResult: any;
  content_visibility = '';
  moduleCode: string = '';
  userEmail: string = '';

  constructor(
    private route: ActivatedRoute, 
    private cdr: ChangeDetectorRef,
    private firestore: AngularFirestore
  ) {}

  ngOnInit() {
    // Subscribe to route query parameters
    this.route.queryParams.subscribe((params) => {
      if (params['moduleCode']) {
        this.moduleCode = params['moduleCode']; // Get module code from parameters
        this.userEmail = params['userEmail'] || ''; // Get user email, default to empty
        this.generateQRCode(); // Initial QR code generation
        this.incrementScannerOpenCount(); // Increment scanner open count
        this.startQRCodeUpdate(); // Start the interval for QR code update
      }
    });
  }

  startQRCodeUpdate() {
    // Update the QR code every 5 seconds
    setInterval(() => {
      this.generateQRCode();
      this.cdr.detectChanges(); 
    }, 5000);
  }
  
  async generateQRCode() {
    try {
      // Create a unique QR code text
      this.qrCodeText = this.moduleCode + '-' + Date.now().toString();
      // Generate QR code data URL
      this.qrCodeDataUrl = await QRCode.toDataURL(this.qrCodeText, {
        width: this.qrCodeSize,
        margin: 1,
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  // Firestore function to increment the scanner open count
incrementScannerOpenCount() {
  // Query Firestore to find the module document by moduleCode
  const moduleCollectionRef = this.firestore.collection<Module>('modules', ref => ref.where('moduleCode', '==', this.moduleCode));

  moduleCollectionRef.get().subscribe(snapshot => {
    if (snapshot.empty) {
      console.error('No module document found for the provided module code');
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data(); // Get the existing document data
      console.log('Existing Document Data:', data); // Log existing document data

      // Get current count or initialize to 0 if not set
      const currentCount = (data && data.scannerOpenCount) ? data.scannerOpenCount : 0;

      // Increment scannerOpenCount by 1
      doc.ref.update({
        scannerOpenCount: currentCount + 1
      }).then(() => {
        console.log('Scanner open count incremented');
      }).catch(error => {
        console.error('Error incrementing scanner open count:', error);
      });
    });
  }, error => {
    console.error('Error fetching module documents:', error);
  });
}

}
