
import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { 
  AngularFirestore, 
  AngularFirestoreDocument,
  DocumentData,
  QueryDocumentSnapshot
} from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { NavController, ModalController, AlertController, ToastController, Platform } from '@ionic/angular';
import { ViewModalComponent } from '../view-modal/view-modal.component';
import { DataService } from '../services/data.service';
import { Router } from '@angular/router';
import jsQR from 'jsqr';
import { EnrollmentService } from '../services/enrollment.service';

interface StudentAttendance {
  studentNumber: string;
  scanTime: string;
}

interface AttendanceRecord {
  [date: string]: StudentAttendance[];
}

interface StudentData {
  email: string;
  name: string;
  studentNumber: string;
  surname: string;
  department: string;
}

interface StudentData {
  department: string;
  studentNumber: string;
  name: string;
  surname: string;
  email: string;
}


@Component({
  selector: 'app-stude-scan',
  templateUrl: './stude-scan.page.html',
  styleUrls: ['./stude-scan.page.scss'],
})
export class StudeScanPage implements OnInit {
  showUserInfo = false;
  currentUser: StudentData = { department: '', email: '', name: '', studentNumber: '', surname: '' };
  email: string = "";
  student: any;
  scanResult: string = '';
  isWeb: boolean;
  videoStream: MediaStream | null = null;
  isScanning: boolean = true;

  @ViewChild('scannerPreview', { static: false }) scannerPreview!: ElementRef<HTMLVideoElement>;

  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private navCtrl: NavController,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private router: Router,
    private data: DataService,
    private platform: Platform,
    private enrollmentService: EnrollmentService
  ) {
    this.isWeb = !this.platform.is('capacitor');
  }

  async ngOnInit() {
    this.getCurrentUser();
    const user = await this.auth.currentUser;
    if (user) {
      this.email = user.email || '';
      this.searchStudent();
    }
  }

  getStudentByEmail(email: string) {
    return this.firestore
      .collection<StudentData>('students', ref => 
        ref.where('email', '==', email))
      .valueChanges();
  }

  async getCurrentUser() {
    return new Promise<StudentData | null>((resolve, reject) => {
      this.auth.onAuthStateChanged((user) => {
        if (user && user.email) { // Check if both user and email exist
          console.log('User signed in:', user.email);
          
          this.getStudentByEmail(user.email).subscribe({
            next: (students) => {
              if (students && students.length > 0) {
                this.currentUser = students[0];
                console.log('Current User:', this.currentUser);
                resolve(this.currentUser);
              } else {
                console.log('No user found with this email');
                this.showToast('Student record not found');
                resolve(null);
              }
            },
            error: (error) => {
              console.error('Error fetching user data:', error);
              this.showToast('Error fetching student data');
              reject(error);
            }
          });
        } else {
          const message = user ? 'User has no email' : 'No user is signed in';
          console.log(message);
          resolve(null);
        }
      });
    });
  }
  
  // For the search method, add similar null checking:
  searchStudent() {
    if (this.email?.trim()) { // Using optional chaining and checking for empty strings
      this.getStudentByEmail(this.email.trim()).subscribe({
        next: (students) => {
          if (students && students.length > 0) {
            this.student = students[0];
            console.log("Student found:", this.student);
          } else {
            console.error("Student not found in database");
            this.student = null;
            this.showToast('No student found with this email');
          }
        },
        error: (error) => {
          console.error("Error fetching student:", error);
          this.student = null;
          this.showToast('Error searching for student');
        }
      });
    } else {
      console.error("Email not provided or empty");
      this.showToast('Please provide a valid email address');
      this.student = null;
    }
  }

  // Type guard function to verify StudentData structure
  private isStudentData(data: unknown): data is StudentData {
    if (!data || typeof data !== 'object') {
      return false;
    }
    
    const candidate = data as Record<string, unknown>;
    
    return (
      typeof candidate['email'] === 'string' &&
      typeof candidate['name'] === 'string' &&
      typeof candidate['studentNumber'] === 'string' &&
      typeof candidate['surname'] === 'string' &&
      typeof candidate['department'] === 'string'
    );
  }

  async CaptureAttendiesDetails(moduleCode: string) {
    try {
      if (!this.currentUser?.studentNumber) {
        this.showToast('Student information not available');
        return;
      }

      if (!moduleCode) {
        this.showToast('Invalid module code');
        return;
      }

      const isEnrolled = await this.enrollmentService.checkStudentEnrollment(
        moduleCode,
        this.currentUser.studentNumber
      );

      if (!isEnrolled) {
        this.showToast('You are not enrolled in this module');
        return;
      }

      const date = new Date();
      const dateString = date.toISOString().split('T')[0];
      const scanTime = date.toLocaleTimeString();

      const attendanceRef = this.firestore.collection('Attended').doc<AttendanceRecord>(moduleCode);
      const doc = await attendanceRef.get().toPromise();

      let attendanceData: AttendanceRecord = {};

      if (doc?.exists) {
        const data = doc.data();
        if (data) {
          attendanceData = data;
        }
      }

      if (attendanceData[dateString]?.some((record) => 
        record.studentNumber === this.currentUser.studentNumber
      )) {
        this.showToast('You have already recorded attendance for today');
        return;
      }

      if (!attendanceData[dateString]) {
        attendanceData[dateString] = [];
      }

      attendanceData[dateString].push({
        studentNumber: this.currentUser.studentNumber,
        scanTime: scanTime
      });

      await attendanceRef.set(attendanceData, { merge: true });
      this.showToast('Attendance recorded successfully');

    } catch (error) {
      console.error('Error recording attendance:', error);
      this.showToast('Error recording attendance');
    }
  }

  toggleUserInfo() {
    this.showUserInfo = !this.showUserInfo;
  }
  
  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to log out?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: () => {
            console.log('Logout canceled');
          }
        },
        {
          text: 'Yes',
          handler: async () => {
            try {
              await this.auth.signOut();  // Firebase sign-out method
              console.log('User logged out successfully');
              this.showToast('You have been logged out.');
              this.router.navigate(['/login']);  // Navigate to login page after logout
            } catch (error) {
              console.error('Error during logout:', error);
              this.showToast('Error during logout. Please try again.');
            }
          }
        }
      ]
    });

    await alert.present();  // Display the alert dialog
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


  // isScanning: boolean = true;  // Initially scanning is active

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

// Method to show a toast notification
async showToast(message: string) {
  const toast = await this.toastController.create({
    message: message,
    duration: 3000,  
    position: 'bottom'  
  });
  toast.present();  // Display the toast
}
}






















