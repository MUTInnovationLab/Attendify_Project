import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { NavController, LoadingController, ToastController } from '@ionic/angular';

interface staff {
  department: string;
  email: string;
  fullName: string;
  position: string;
  staffNumber: number;
}

interface student {
  email: string;
  fullName: string;
  studentNumber: number;
  // Add other relevant student fields
}

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  username: string = '';
  password: string = '';
  emailRegex: RegExp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  adminEmail: string = 'mutinnovationlab@gmail.com';
  adminPassword: string = 'InnovationLab123';

  constructor(
    private db: AngularFirestore,
    private loadingController: LoadingController,
    private auth: AngularFireAuth,
    private navController: NavController,
    private toastController: ToastController
  ) {}

  ngOnInit() {}

  async validate() {
    if (!this.username || !this.password) {
      this.presentToast('Please enter your username and password.');
      return;
    }
    await this.login();
  }

  async login() {
    const loader = await this.loadingController.create({
      message: 'Signing in',
      cssClass: 'custom-loader-class'
    });

    try {
      await loader.present();

      // Check for admin login first
      if (this.username === this.adminEmail && this.password === this.adminPassword) {
        await this.auth.signInWithEmailAndPassword(this.adminEmail, this.adminPassword);
        loader.dismiss();
        this.navController.navigateForward('/dashboard');
        return;
      }

      const staffData = await this.getStaffData();
      
      if (staffData) {
        // Staff login
        await this.auth.signInWithEmailAndPassword(staffData.email, this.password);
        loader.dismiss();
        this.navigateBasedOnUserType(staffData.position);
      } else {
        // Student login or unknown user
        const studentData = await this.getStudentData();
        
        if (studentData) {
          await this.auth.signInWithEmailAndPassword(studentData.email, this.password);
          loader.dismiss();
          this.navigateBasedOnUserType('student');
        } else {
          loader.dismiss();
          this.presentToast('Invalid username or password');
        }
      }
    } catch (error) {
      loader.dismiss();
      this.handleLoginError(error);
    }
  }

  async getUserType(): Promise<string> {
    const studentData = await this.getStudentData();
    if (studentData) {
      return 'student';
    }

    const staffData = await this.getStaffData();
    if (staffData) {
      return staffData.position;
    }

    return 'unknown';
  }

  async getStudentData(): Promise<student | null> {
    const studentEmailQuerySnapshot = await this.db.collection('students')
      .ref.where('email', '==', this.username)
      .get();

    if (!studentEmailQuerySnapshot.empty) {
      return studentEmailQuerySnapshot.docs[0].data() as student;
    }

    const studentNumberQuerySnapshot = await this.db.collection('students')
      .ref.where('studentNumber', '==', this.username)
      .get();
    
    if (!studentNumberQuerySnapshot.empty) {
      return studentNumberQuerySnapshot.docs[0].data() as student;
    }

    return null;
  }

  async getStaffData(): Promise<staff | null> {
    const staffEmailQuerySnapshot = await this.db.collection('staff')
      .ref.where('email', '==', this.username)
      .get();

    if (!staffEmailQuerySnapshot.empty) {
      return staffEmailQuerySnapshot.docs[0].data() as staff;
    }

    const staffNumberQuerySnapshot = await this.db.collection(' staff')
      .ref.where('staffNumber', '==', this.username)
      .get();
    
    if (!staffNumberQuerySnapshot.empty) {
      return staffNumberQuerySnapshot.docs[0].data() as staff;
    }

    return null;
  }

  handleLoginError(error: any) {
    const errorMessage = (error as Error).message;
    console.error('Login error:', errorMessage);
    
    switch (errorMessage) {
      case 'Firebase: The password is invalid or the user does not have a password. (auth/wrong-password)':
      case 'Firebase: There is no user record corresponding to this identifier. The user may have been deleted. (auth/user-not-found)':
        this.presentToast('Invalid username or password');
        break;
      case 'Firebase: The email address is badly formatted. (auth/invalid-email)':
        this.presentToast('Incorrectly formatted email');
        break;
      default:
        this.presentToast('An unexpected error occurred. Please try again.');
        break;
    }
  }

  navigateBasedOnUserType(userType: string) {
    switch (userType) {
      case 'student':
        this.navController.navigateForward('/profile');
        break;
      case 'lecturer':
        this.navController.navigateForward('/lecture');
        break;
      case 'dept-admin':
        this.navController.navigateForward('/dept-an');
        break;
      default:
        this.presentToast('Unknown user type');
        break;
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: 'danger'
    });
    toast.present();
  }
}