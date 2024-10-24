import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { NavController, ModalController, AlertController, ToastController, Platform } from '@ionic/angular';
import { ViewModalComponent } from '../view-modal/view-modal.component';
import { DataService } from '../services/data.service';
import { Router } from '@angular/router';
import jsQR from 'jsqr'; // Add jsQR for web QR code scanning
import { EnrollmentService } from '../services/enrollment.service';

interface StudentAttendance {
  studentNumber: string;
  scanTime: string;
}

interface AttendanceRecord {
  [date: string]: StudentAttendance[]; // Dates are string keys, each holding an array of student attendance
}

// interface EnrolledModules {
//   enrolled: any[];
//   moduleCode: string;
//   // Add any other fields that you expect in this document
// }



interface StudentData {
  email: string;
  name: string;
  studentNumber: string;
  surname: string;
  department:string;
}

// interface EnrolledModule {
//   enrolled: {
//     studentNumber: string;
//   }[];
// }



@Component({
  selector: 'app-stude-scan',
  templateUrl: './stude-scan.page.html',
  styleUrls: ['./stude-scan.page.scss'],
})
export class StudeScanPage implements OnInit {

  showUserInfo = false;
  currentUser: StudentData = { department: '' ,email: '', name: '', studentNumber: '', surname: '' };

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
    private router: Router,
    private data: DataService,
    private platform: Platform,
    private enrollmentService: EnrollmentService
  ) {
    this.isWeb = !this.platform.is('capacitor'); // Check if running on web
  }

  async ngOnInit() {

   

    this.getCurrentUser();
   
    const user = await this.auth.currentUser;
    if (user) {
      this.email = user.email || '';
      this.searchStudent();
      
    }
  }

  toggleUserInfo() {
    this.showUserInfo = !this.showUserInfo;
  }

  dismiss() {
    this.router.navigate(['/login']); // Navigate to LecturePage
  }

  async getCurrentUser() {
    await this.auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('User signed in:', user.email);
        this.firestore
          .collection('students', (ref) =>
            ref.where('email', '==', user.email)
          )
          .get()
          .subscribe(
            (querySnapshot) => {
              if (querySnapshot.empty) {
                console.log('No user found with this email');
              } else {
                querySnapshot.forEach((doc) => {
                  this.currentUser = doc.data() as StudentData;
                  console.log('Current User:', this.currentUser);
                  this.CaptureAttendiesDetails();
                });
              }
            },
            (error) => {
              console.error('Error fetching user data:', error);
            }
          );
      } else {
        console.log('No user is signed in');
      }
    });
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

  
 


  async CaptureAttendiesDetails(moduleCode: string = "CA100") {
    // Check if student information is available
    alert(moduleCode);
    if (!this.currentUser.studentNumber) {
      console.error('Student information not available.');
      this.showToast('Student information not available.');
      return;
    }
  
    // Check if the module code is provided
    if (!moduleCode) {
      console.error('Module code not provided.');
      this.showToast('Module code not provided.');
      return;
    }
  
    
    try {


      const isEnrolled = await this.enrollmentService.checkStudentEnrollment(moduleCode, this.currentUser.studentNumber);
    if (!isEnrolled) {
      console.error('Student is not enrolled in the specified module.');
      this.showToast('You are not enrolled in this module.');
      return;
    }

    console.log('Student is enrolled, capturing attendance...');
      



      
      // Capture current date and time
      const date = new Date();
      const dateString = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const scanTime = date.toLocaleTimeString(); // Example: "10:15 AM"
  
      // Prepare the attendance details object
      const studentAttendance: StudentAttendance = {
        studentNumber: this.currentUser.studentNumber,
        scanTime: scanTime
      };
  
      // Reference to the attendance document for the module
      const attendanceRef = this.firestore.collection('Attended').doc(moduleCode);
      const doc = await attendanceRef.get().toPromise();
  
      // Initialize an empty object for attendance records
      let existingData: AttendanceRecord = {};
  
      // Check if the document for the module exists
      if (doc && doc.exists) {
        existingData = doc.data() as AttendanceRecord;
      }
  
      // Check if there are existing records for today's date
      if (existingData[dateString]) {
        // Find if the student has already scanned today
        const alreadyScanned = existingData[dateString].some((attendance: StudentAttendance) =>
          attendance.studentNumber === this.currentUser.studentNumber
        );
        
        if (alreadyScanned) {
          console.error('Student has already scanned today.');
          this.showToast('You have already scanned in for today.');
          return; // Exit early to prevent duplicate scan
        }
  
        // If student hasn't scanned today, add them to the list
        existingData[dateString].push(studentAttendance);
      } else {
        // If no records exist for today, create a new entry for today
        existingData[dateString] = [studentAttendance];
      }
      alert('2');
      // Update the document with the new attendance details (merge: true to avoid overwriting)
      await attendanceRef.set(existingData, { merge: true });
      alert('3');
      console.log('Attendance stored successfully for', moduleCode);
      this.showToast('Attendance recorded successfully.');
    } catch (error) {
      console.error('Error capturing attendance details:', error);
      this.showToast('Error storing attendance. Please try again.');
    }
  }
  


  
  // async CaptureAttendiesDetails(moduleCode: string = "IS100") {
  //   //Check if student information is available
  //   alert('here!!!!!!!!!!! MODULE=IS100; USER=22005010');

  //   if (!this.currentUser) {
  //     console.error('Student information not available.');
  //     this.showToast('Student information not available.');
  //     return;
  //   }
  
  //   // Check if the module code is provided
  //   if (!moduleCode) {
  //     console.error('Module code not provided.');
  //     this.showToast('Module code not provided.');
  //     return;
  //   }
  
  //   try {
  //     alert('2');
  //     // Reference to the specific module document using moduleCode
      
  //     alert('4');
     
  
  //     if (!this.enrollmentService.checkStudentEnrollment(moduleCode,this.student)) {
  //       console.error('Student is not enrolled in the specified module.');
  //       this.showToast('You are not enrolled in this module.');
  //       return;
  //     }
  //     alert('6');
  //     // Capture current date and time
  //     const date = new Date();
  //     const dateString = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  //     const scanTime = date.toLocaleTimeString(); // Example: "10:15 AM"
  //     alert('7');
  //     // Prepare the attendance details object
  //     const studentAttendance: StudentAttendance = {
  //       studentNumber: this.student.studentNumber,
  //       scanTime: scanTime
  //     };
  //     alert('8');
  //     // Reference to the attendance collection for the module
  //     const attendanceRef = this.firestore.collection('Attended').doc(moduleCode);
  //     const doc = await attendanceRef.get().toPromise();
  //     alert('10');
  //     // Initialize an empty object for existing attendance records
  //     let existingData: AttendanceRecord = {};
  
  //     // Check if the document for the module exists
  //     if (doc && doc.exists) {
  //       existingData = doc.data() as AttendanceRecord; // Explicitly cast doc data to AttendanceRecord type
  //       alert('11');
  //     }
  
  //     // Check if there are existing records for today's date
  //     if (existingData[dateString]) {
  //       // Find if the student has already scanned today
  //       const alreadyScanned = existingData[dateString].some(attendance => attendance.studentNumber === this.student.studentNumber);
  //       alert('12');
  //       if (alreadyScanned) {
  //         console.error('Student has already scanned today.');
  //         this.showToast('You have already scanned in for today.');
  //         return; // Exit early to prevent duplicate scan
  //       }
  //       alert('13');
  
  //       // If student hasn't scanned today, add them to the list
  //       existingData[dateString].push(studentAttendance);
  //     } else {
  //       // If no records exist for today, create a new entry
  //       alert('14');
  //       existingData[dateString] = [studentAttendance];
  //     }
  //     alert('13');
  //     // Update the document with the new details
  //     await attendanceRef.set(existingData, { merge: true });
  
  //     console.log('Attendance stored successfully for', moduleCode);
  //     this.showToast('Attendance recorded successfully.');
  //   } catch (error) {
  //     console.error('Error capturing attendance details:', error);
  //     this.showToast('Error storing attendance. Please try again.');
  //   }
  // }



  

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