import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as QRCode from 'qrcode';
import { AngularFirestore } from '@angular/fire/compat/firestore';

// Define the structure of your module document
interface Module {
  modules: any;
  moduleCode: string;
  moduleLevel: string;
  moduleName: string;
  userEmail: string;
  scannerOpenCount?: number; // Optional property for tracking scanner opens
}

interface ModuleItem {
  department: string;
  faculty: string;
  moduleCode: string;
  moduleLevel: string;
  moduleName: string;
  scannerOpenCount?: number;
  userEmail: string;
}

// Interface for the document structure
interface AssignedLectureDoc {
  modules: ModuleItem[];
  [key: string]: any; // For any other fields that might exist in the document
}

@Component({
  selector: 'app-qr-scan',
  templateUrl: './qr-scan.page.html',
  styleUrls: ['./qr-scan.page.scss'],
})
export class QrScanPage implements OnInit {

  qrCodeDataUrl: string = '';

  qrCodeText: string = '';
  qrCodeTextNew : string = '';
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
      this.qrCodeTextNew = this.moduleCode;
      // Generate QR code data URL
      this.qrCodeDataUrl = await QRCode.toDataURL(this.qrCodeTextNew, {
        width: this.qrCodeSize,
        margin: 1,
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }



  // Firestore function to increment the scanner open count
  incrementScannerOpenCount() {
    const moduleCollectionRef = this.firestore.collection<AssignedLectureDoc>('assignedLectures');
    
    moduleCollectionRef.get().subscribe(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data() as AssignedLectureDoc;
        
        // Check if document has modules array
        if (data.modules && Array.isArray(data.modules)) {
          // Find the index of the module with matching moduleCode
          const moduleIndex = data.modules.findIndex((module: ModuleItem) => 
            module.moduleCode === this.moduleCode
          );
  
          // If module is found
          if (moduleIndex !== -1) {
            // Create the update object using arrayUnion to update the specific module
            const modules = data.modules;
            
            // Get current count or initialize to 0
            const currentCount = modules[moduleIndex].scannerOpenCount || 0;
            
            // Update the count for the specific module
            modules[moduleIndex].scannerOpenCount = currentCount + 1;
            
            // Update the document with the modified modules array
            doc.ref.update({
              modules: modules
            }).then(() => {
              console.log(`Scanner open count incremented for module ${this.moduleCode}`);
            }).catch(error => {
              console.error('Error updating scanner open count:', error);
            });
          }
        }
      });
    }, error => {
      console.error('Error fetching documents:', error);
    });
  }
}
