import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AlertController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface Faculty {
  id: string;
  departments: Department[];
}

interface Department {
  name: string;
  streams?: { [key: string]: any };
  modules?: any[];
}

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  email: string = "";
  name: string = "";
  surname: string = "";
  studentNumber: string = "";
  password: string = "";
  
  // New properties for faculty/department selection
  faculties: Faculty[] = [];
  selectedFaculty: string = "";
  departments: Department[] = [];
  selectedDepartment: string = "";

  constructor(
    private alertController: AlertController,
    private loadingController: LoadingController,
    private router: Router,
    private auth: AngularFireAuth,
    private toastController: ToastController,
    private navCtrl: NavController,
    private firestore: AngularFirestore
  ) {}

  ngOnInit() {
    this.loadFaculties();
  }

  // Load faculties from Firestore
  loadFaculties() {
    this.firestore.collection('faculties').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Faculty;
        const id = a.payload.doc.id;
        return { ...data };  // Exclude 'id' from the spread
      }))
    ).subscribe(faculties => {
      this.faculties = faculties;
    });
  }
  
  // Update departments when faculty is selected
  onFacultyChange(event: any) {
    const selectedFacultyId = event.detail.value;
    this.selectedFaculty = selectedFacultyId;
    
    // Reset department selection
    this.selectedDepartment = "";
    this.departments = [];

    // Find selected faculty and get its departments
    const faculty = this.faculties.find(f => f.id === selectedFacultyId);
    if (faculty) {
      this.departments = faculty.departments;
    }
  }

  // Handle department selection
  onDepartmentChange(event: any) {
    this.selectedDepartment = event.detail.value;
  }

  async register() {
    // Validate all required fields
    if (!this.email || !this.password || !this.name || !this.surname || 
        !this.studentNumber || !this.selectedFaculty || !this.selectedDepartment) {
      this.presentToast('Please fill in all required fields.', 'danger');
      return;
    }

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this.email)) {
      this.presentToast('Please enter a valid email address.', 'danger');
      return;
    }

    const loader = await this.loadingController.create({
      message: 'Signing up...',
      cssClass: 'custom-loader-class'
    });
    await loader.present();

    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(this.email, this.password);
      
      // Save the student's data
      await this.firestore.collection('students').doc(this.studentNumber).set({
        email: this.email,
        name: this.name,
        surname: this.surname,
        studentNumber: this.studentNumber,
        faculty: this.selectedFaculty,
        department: this.selectedDepartment
      });

      loader.dismiss();
      this.presentToast('Successfully registered!', 'success');
      this.router.navigateByUrl("/login");
    } catch (error: any) {
      loader.dismiss();
      const errorMessage = error.message;

      if (errorMessage.includes('auth/missing-email')) {
        this.presentToast('Email is missing.', 'danger');
      } else if (errorMessage.includes('auth/invalid-email')) {
        this.presentToast('The email address is badly formatted.', 'danger');
      } else if (errorMessage.includes('auth/email-already-in-use')) {
        this.presentToast('This email is already in use.', 'danger');
      } else if (errorMessage.includes('auth/user-not-found')) {
        this.presentToast('Invalid email.', 'danger');
      } else {
        this.presentToast(errorMessage, 'danger');
      }
    }
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 1500,
      position: 'top',
      color: color
    });
    toast.present();
  }

  goToPage() {
    this.navCtrl.navigateForward("/login");
  }
}