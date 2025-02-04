import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController, ModalController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FacultyDepartmentService } from '../services/faculty-department.service'; 
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
})
export class AdminPage implements OnInit {
  // Existing properties
  fullName: string = '';
  staffNumber: string = '';
  email: string = '';
  position: string = '';
  faculties$!: Observable<string[]>;
  departments$!: Observable<string[]>;
  
  selectedFaculty: string = '';
  selectedDepartment: string = '';
  showAddCard: boolean = false;
  moduleName: string = '';
  moduleCode: string = '';
  moduleLevel: string = '';

  // Modal references
  isLecturerModalOpen: boolean = false;
  isModuleModalOpen: boolean = false;

  constructor(
    private alertController: AlertController,
    private loadingController: LoadingController,
    private router: Router,
    private auth: AngularFireAuth,
    private toastController: ToastController,
    private navCtrl: NavController,
    private firestore: AngularFirestore,
    private facultyDepartmentService: FacultyDepartmentService,
    private modalController: ModalController
  ) {
    this.selectedFaculty = '';
    this.selectedDepartment = '';
  }

  ngOnInit(): void {
    // Fetch faculties from Firestore
    this.faculties$ = this.facultyDepartmentService.getFaculties();
  }

  // Add missing navigation methods
  navigateToDeptAnalytics() {
    this.router.navigate(['/dept-analytics']);
  }

  viewLecturers() {
    this.router.navigate(['/view-lecturers']);
  }

  viewStudents() {
    this.router.navigate(['/view-students']);
  }

  viewLecturersAndStudents() {
    this.router.navigate(['/dept-an']);
  }

  onFacultyChange(event: any) {
    const selectedFaculty = event.detail.value;
    this.selectedFaculty = selectedFaculty;
    this.departments$ = this.facultyDepartmentService.getDepartments(selectedFaculty);
    this.selectedDepartment = '';
  }
  
  // Modal control methods
  openLecturerModal() {
    this.isLecturerModalOpen = true;
    // Reset form fields
    this.fullName = '';
    this.staffNumber = '';
    this.email = '';
    this.selectedFaculty = '';
    this.selectedDepartment = '';
  }

  closeLecturerModal() {
    this.isLecturerModalOpen = false;
  }

  async submitForm() {
    // Validate form fields
    if (!this.fullName || !this.staffNumber || !this.email || 
        this.selectedFaculty === '' || this.selectedDepartment === '') {
      this.presentToast('Please fill in all fields');
      return;
    }
  
    const loader = await this.loadingController.create({
      message: 'Signing up',
      cssClass: 'custom-loader-class'
    });
    await loader.present();
  
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(this.email, this.staffNumber);
      const position = 'Lecturer'; // Ensure position is always 'Lecturer'
  
      this.closeLecturerModal();
      
      // Add the new staff member to Firestore
      await this.firestore.collection('staff').doc(this.staffNumber).set({
        staffNumber: this.staffNumber,
        email: this.email,
        fullName: this.fullName,
        position: position,
        faculty: this.selectedFaculty,
        department: this.selectedDepartment
      });
  
      await loader.dismiss();
      this.presentToast("Successfully registered!");
      await this.navigateToBoard();

    } catch (error) {
      await loader.dismiss();
      this.handleError(error);
    }
  }
  
  private async navigateToBoard() {
    await this.router.navigate(['/board'], {
      state: {
        fullName: this.fullName,
        staffNumber: this.staffNumber,
        email: this.email,
        position: this.position,
        faculty: this.selectedFaculty,
        department: this.selectedDepartment
      }
    });
  }
  
  private handleError(error: any) {
    let errorMessage = error.message;
    console.error('Error:', errorMessage);
  
    switch (errorMessage) {
      case "Firebase: The email address is badly formatted. (auth/invalid-email).":
        this.presentToast("Badly formatted email");
        break;
      case "Firebase: The email address is already in use by another account. (auth/email-already-in-use).":
        this.presentToast("Email already in use");
        break;
      case "Firebase: There is no user record corresponding to this identifier. The user may have been deleted. (auth/user-not-found).":
        this.presentToast("Invalid email");
        break;
      default:
        this.presentToast(errorMessage);
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 1500,
      position: 'top'
    });
    toast.present();
  }

  async presentConfirmationAlert() {
    const alert = await this.alertController.create({
      header: 'Confirm Logout',
      message: 'Are you sure you want to log out?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            // Do nothing if user cancels
          }
        },
        {
          text: 'Yes',
          handler: async () => {
            try {
              // Sign out from Firebase Authentication
              await this.auth.signOut();
              
              // Navigate back to login page
              await this.router.navigate(['/login']);
            } catch (error) {
              console.error('Logout error:', error);
              this.presentToast('Error logging out');
            }
          }
        }
      ]
    });
  
    await alert.present();
  }
}