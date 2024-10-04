import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { NavController, ModalController, AlertController, ToastController, Platform } from '@ionic/angular';
import { ViewModalComponent } from '../view-modal/view-modal.component';
import { DataService } from '../services/data.service';
import jsQR from 'jsqr'; // Add jsQR for web QR code scanning

@Component({
  selector: 'app-stude-scan',
  templateUrl: './stude-scan.page.html',
  styleUrls: ['./stude-scan.page.scss'],
})
export class StudeScanPage implements OnInit {
  email: string = "";
  student: any;
  scanResult: string = '';
  isWeb: boolean;
  videoStream: MediaStream | null = null;
  @ViewChild('scannerPreview', { static: false }) scannerPreview!: ElementRef<HTMLVideoElement>;

  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private navCtrl: NavController,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private data: DataService,
    private platform: Platform
  ) {
    this.isWeb = !this.platform.is('capacitor'); // Check if running on web
  }

  async ngOnInit() {
    const user = await this.auth.currentUser;
    if (user) {
      this.email = user.email || '';
      this.searchStudent();
    }
  }

  async presentViewModal() {
    const modal = await this.modalController.create({
      component: ViewModalComponent
    });
    return await modal.present();
  }

  searchStudent() {
    if (this.email) {
      this.data.getStudentByEmail(this.email).subscribe(data => {
        if (data.length > 0) {
          this.student = data[0];
          console.log("Student found:", this.student);
        } else {
          console.error("Current user not found in database");
          this.student = null;
        }
      });
    } else {
      console.error("Email not found in user profile");
      this.student = null;
    }
  }

  async startScan() {
    if (this.isWeb) {
      this.startWebScan(); // Web QR scan
    } else {
      this.startMobileScan(); // Mobile scan with Capacitor
    }
  }

  // Mobile scan logic using Capacitor Barcode Scanner
  async startMobileScan() {
    const permission = await BarcodeScanner.checkPermission({ force: true });
    if (!permission.granted) {
      this.scanResult = 'Camera permission not granted';
      return;
    }

    const result = await BarcodeScanner.startScan();
    if (result.hasContent) {
      this.scanResult = result.content;
      this.CaptureAttendiesDetails(this.scanResult);
    } else {
      this.scanResult = 'No content found in scan';
    }
  }

  // Web scan logic using getUserMedia and jsQR
  async startWebScan() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        console.log('Requesting camera access for web scanning...');
        this.videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } // Rear camera if available
        });

        const videoElement = this.scannerPreview.nativeElement;
        videoElement.srcObject = this.videoStream;
        videoElement.play();

        videoElement.onloadedmetadata = () => {
          console.log("Video metadata loaded, starting scan...");
          videoElement.play();
        };

        this.scanWebVideoFrame();
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error('Error accessing camera:', error.message);
          this.scanResult = 'Error accessing camera: ' + error.message;
        } else {
          console.error('Unknown error accessing camera');
          this.scanResult = 'Unknown error occurred while accessing the camera';
        }
      }
    } else {
      console.error('Browser does not support getUserMedia');
      this.scanResult = 'Camera not supported on this browser';
    }
  }

  scanWebVideoFrame() {
    const videoElement = this.scannerPreview.nativeElement;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const scan = () => {
      if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        context?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);

        if (imageData) {
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            console.log("QR code detected:", code.data);
            this.scanResult = code.data;
            this.CaptureAttendiesDetails(this.scanResult);
            this.stopScan();
          } else {
            console.log("No QR code detected, continuing scan...");
            requestAnimationFrame(scan);
          }
        }
      } else {
        console.log("Video not ready, waiting for next frame...");
        requestAnimationFrame(scan);
      }
    };

    requestAnimationFrame(scan);
  }


  isScanning: boolean = true;  // Initially scanning is active

  stopScan() {
    if (this.isWeb) {
      if (this.videoStream) {
        this.videoStream.getTracks().forEach(track => track.stop());
        this.videoStream = null;
        console.log("Web scan stopped, video stream closed.");
      }
    } else {
      BarcodeScanner.stopScan();
      console.log("Mobile scan stopped.");
    }

    
    this.isScanning = false;
  }








  
  async CaptureAttendiesDetails(moduleCode: string = "") {
    if (!this.student) {
      console.error('Student information not available.');
      this.showToast('Student information not available.');
      return;
    }

    if (!moduleCode) {
      console.error('Module code not provided.');
      this.showToast('Module code not provided.');
      return;
    }

    const date = new Date();
    const dateString = date.toDateString();

    const attendanceDetails = {
      email: this.student.email,
      name: this.student.name,
      surname: this.student.surname,
      studentNumber: this.student.studentNumber,
      scanDate: dateString,
      module: moduleCode
    };

    try {
      await this.firestore.collection('AttendedStudents')
        .doc(moduleCode)
        .collection(attendanceDetails.scanDate)
        .doc(this.student.email)
        .set(attendanceDetails);
      console.log('Attendance stored successfully:', attendanceDetails);
    } catch (error) {
      console.error('Error storing attendance details:', error);
    }
  }

  // Method to show a toast notification
  async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom'
    });
    toast.present();
  }

}


