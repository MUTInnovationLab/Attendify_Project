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
  faculties$!: Observable<string[]>; // Observable for faculties
  departments$!: Observable<string[]>; // Observable for departments
  
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

  onFacultyChange(event: any) {
    const selectedFaculty = event.detail.value;
    this.selectedFaculty = selectedFaculty; // Capture the selected faculty
    this.departments$ = this.facultyDepartmentService.getDepartments(selectedFaculty);
    this.selectedDepartment = ''; // Reset selected department when faculty changes
  }
  
  // Modal control methods
  openLecturerModal() {
    this.isLecturerModalOpen = true;
    // Reset form fields
    this.fullName = '';
    this.staffNumber = '';
    this.email = '';
    this.position = '';
    this.selectedFaculty = '';
    this.selectedDepartment = '';
  }

  openModuleModal() {
    this.isModuleModalOpen = true;
    // Reset form fields
    this.moduleName = '';
    this.moduleCode = '';
    this.moduleLevel = '';
  }

  closeLecturerModal() {
    this.isLecturerModalOpen = false;
  }

  closeModuleModal() {
    this.isModuleModalOpen = false;
  }

  async submitForm() {
    // Validate form fields
    if (!this.fullName || !this.staffNumber || !this.email || !this.position || this.selectedFaculty === '' || this.selectedDepartment === '') {
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
      const position = this.position.trim().toLowerCase() === 'lecturer' ? 'Lecturer' : this.position;
  
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
  
  async addModule() {
    if (!this.moduleName || !this.moduleCode || !this.moduleLevel || !this.selectedDepartment) {
      this.presentToast('Please fill in all fields');
      return;
    }

    const loader = await this.loadingController.create({
      message: 'Adding module...',
      cssClass: 'custom-loader-class'
    });
    await loader.present();

    try {
      // Create a new document in the modules collection
      await this.firestore.collection('modules').add({
        name: this.moduleName,
        code: this.moduleCode,
        level: this.moduleLevel,
        department: this.selectedDepartment,
        faculty: this.selectedFaculty,
        createdAt: new Date()
      });

      loader.dismiss();
      this.closeModuleModal();
      this.presentToast('Module added successfully');
    } catch (error) {
      loader.dismiss();
      this.presentToast('Error adding module');
      console.error('Error adding module:', error);
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

  dismiss() {
    this.router.navigate(['/login']);
  }

  goBack() {
    this.navCtrl.navigateBack('/dashboard');
  }
}
