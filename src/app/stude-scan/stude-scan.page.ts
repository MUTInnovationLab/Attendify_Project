import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { NavController, AlertController, ToastController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { DataService } from '../services/data.service';
import { EnrollmentService } from '../services/enrollment.service';
import { BarcodeFormat } from '@zxing/library';

// Update interfaces
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
  isScanning: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  
  // ZXing specific properties
  scannerEnabled = false;
  availableDevices: MediaDeviceInfo[] = [];
  currentDevice: MediaDeviceInfo | undefined;
  hasCameraPermission: boolean = false;
  
  // Scanner configuration
  formatsEnabled: BarcodeFormat[] = [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.EAN_13,
    BarcodeFormat.CODE_128,
    BarcodeFormat.DATA_MATRIX
  ];

  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private navCtrl: NavController,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private data: DataService,
    private platform: Platform,
    private enrollmentService: EnrollmentService
  ) {}

  async ngOnInit() {
    try {
      this.checkPermissions(); // Manual fallback
  
      await this.getCurrentUser();
      const user = await this.auth.currentUser;
      if (user) {
        this.email = user.email || '';
        await this.searchStudent();
      }
    } catch (error) {
      this.showError('Error initializing scanner page');
    }
  }

  ngOnDestroy() {
    this.stopScan();
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
        if (user && user.email) {
          this.getStudentByEmail(user.email).subscribe({
            next: (students) => {
              if (students && students.length > 0) {
                this.currentUser = students[0];
                resolve(this.currentUser);
              } else {
                this.showError('Student record not found');
                resolve(null);
              }
            },
            error: (error) => {
              this.showError('Error fetching student data');
              reject(error);
            }
          });
        } else {
          this.showError('No user is currently signed in');
          resolve(null);
        }
      });
    });
  }

  searchStudent() {
    if (this.email?.trim()) {
      this.getStudentByEmail(this.email.trim()).subscribe({
        next: (students) => {
          if (students && students.length > 0) {
            this.student = students[0];
          } else {
            this.student = null;
            this.showError('No student found with this email');
          }
        },
        error: (error) => {
          this.student = null;
          this.showError('Error searching for student');
        }
      });
    } else {
      this.showError('Please provide a valid email address');
      this.student = null;
    }
  }

  async CaptureAttendiesDetails(moduleCode: string) {
    try {
      if (!this.currentUser?.studentNumber) {
        this.showError('Student information not available');
        return;
      }

      if (!moduleCode) {
        this.showError('Invalid QR code - Module code not found');
        return;
      }

      const isEnrolled = await this.enrollmentService.checkStudentEnrollment(
        moduleCode,
        this.currentUser.studentNumber
      );

      if (!isEnrolled) {
        this.showError('You are not enrolled in this module');
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
        this.showError('You have already recorded attendance for today');
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
      this.showSuccess('Attendance recorded successfully');

    } catch (error) {
      console.error('Error recording attendance:', error);
      this.showError('Error recording attendance');
    }
  }


  async checkPermissions(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      this.hasCameraPermission = videoDevices.length > 0;
      if (!this.hasCameraPermission) {
        this.showError('Camera permission is required');
      }
    } catch (error) {
      this.showError('Unable to check camera permissions');
      this.hasCameraPermission = false;
    }
  }
  
  // ZXing specific methods
  onScanSuccess(result: string) {
    if (result) {
      this.scanResult = result;
      this.CaptureAttendiesDetails(result);
      this.stopScan();
    }
  }

  onScanError(error: any) {
    console.error('Scanner error:', error);
    this.showError('Scanner error occurred. Please try again');
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.availableDevices = devices;
    if (devices.length > 0) {
      this.currentDevice = devices[0];
    } else {
      this.showError('No cameras found on device');
    }
  }

  onHasPermission(permitted: boolean): void {
    this.hasCameraPermission = permitted;
    if (!permitted) {
      this.showError('Camera permission is required to scan QR codes');
    }
  }



  async startScan() {
    
    if (!this.hasCameraPermission) {
      this.showError('Camera permission is required');
      return;
    }
    
    try {
      this.scannerEnabled = true;
      this.isScanning = true;
      this.showSuccess('Scanner started');
    } catch (error) {
      this.showError('Error starting scanner');
    }
  }

  stopScan() {
    try {
      this.scannerEnabled = false;
      this.isScanning = false;
      this.showSuccess('Scanner stopped');
    } catch (error) {
      this.showError('Error stopping scanner');
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
          role: 'cancel'
        },
        {
          text: 'Yes',
          handler: async () => {
            try {
              await this.auth.signOut();
              this.showSuccess('You have been logged out');
              this.router.navigate(['/login']);
            } catch (error) {
              this.showError('Error during logout. Please try again');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Toast message methods
  async showSuccess(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'success',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  async showError(message: string) {
    this.hasError = true;
    this.errorMessage = message;
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }
}