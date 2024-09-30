import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { NavController, ModalController, AlertController, ToastController } from '@ionic/angular';
import { ViewModalComponent } from '../view-modal/view-modal.component';
import { map } from 'rxjs/operators';
import { DataService } from '../services/data.service';
// import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
// import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

interface UserData {
  name: string;
  surname: string;
  studentNumber: string;
  email: string;
}
@Component({
  selector: 'app-stude-scan',
  templateUrl: './stude-scan.page.html',
  styleUrls: ['./stude-scan.page.scss'],
})
export class StudeScanPage implements OnInit {
  email:string="";
  
student:any;

  @ViewChild('scannerPreview', { static: false })
  scannerPreview!: ElementRef;
  scanResult: string = '';

  
  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private navCtrl: NavController,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private data: DataService
  ) {}

  async ngOnInit() {
    const user = await this.auth.currentUser;

    if (user) {
      const userEmail: string = user.email || '';
      alert(userEmail);
      this.email = userEmail;
      // this.captureAttendies();
      this.searchStudent();
    //   if(this.student){
    //   alert(JSON.stringify(this.student)); 
    // }
    // else{
    //   alert("there is nothing on a object student");
    // }
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
      alert("I am here as " + this.email);
      this.data.getStudentByEmail(this.email).subscribe(data => {
        if (data.length > 0) {

          this.student = data[0]; 
          alert(JSON.stringify(this.student));
        } else {
          alert("Current User not found");
          this.student = null;
        }
      });
    } else {
      alert("Current User not found");
      this.student = null;
    }
  }

  async startScan() {
    const permission = await BarcodeScanner.checkPermission({ force: true });
    if (!permission.granted) {
      this.scanResult = 'Camera permission is not granted';

      this.CaptureAttendiesDetails();
      return;
    }

    BarcodeScanner.hideBackground(); 
    const result = await BarcodeScanner.startScan();

    if (result.hasContent) {
      this.scanResult = result.content; // Process the scan result
      this.CaptureAttendiesDetails(this.scanResult);
      
    } else {
      this.scanResult = 'No content found';
    }

    BarcodeScanner.showBackground(); // Make the background of WebView visible again
  }

  stopScan() {
    BarcodeScanner.stopScan();
    BarcodeScanner.showBackground(); // Make the background of WebView visible again
  }

  async CaptureAttendiesDetails(moduleCode:string = ""){

         alert(JSON.stringify(this.student));
        
        const date = new Date();
        const dateString = date.toDateString();

        const attendanceDetails = {
          email: this.student.email,
          name: this.student.name,
          surname:this.student.surname,
          studentNumber: this.student.studentNumber,
          scanDate: dateString,
          module: moduleCode
        };

        await this.firestore.collection('AttendedStudents').doc(moduleCode).collection(attendanceDetails.scanDate).doc(this.email).set(attendanceDetails);
        console.log('Attendance stored successfully.');





  }
   
}




































































































































































