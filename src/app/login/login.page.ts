import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { NavController, LoadingController, ToastController } from '@ionic/angular';
// import { Staff }from '../services/staff.mode';]
interface staff{
  department:string;
  email:string;
  fullName:string;
  position:string;
  staffNumber:number;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  email: string = '';
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
    if (!this.email || !this.password) {
      this.presentToast('Please enter your email and password.');
      return;
    }
    if (!this.emailRegex.test(this.email)) {
      this.presentToast('Please provide a valid email address.');
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
  

  
      const userCredential = await this.auth.signInWithEmailAndPassword(this.email, this.password);

      if (this.email === 'mutinnovationlab@gmail.com' && this.password === 'InnovationLab123') {
        loader.dismiss();
        this.navController.navigateForward('/dashboard');
        return;
      }
  
      if (userCredential) {
        const userType = await this.getUserType();
        loader.dismiss();
        this.navigateBasedOnUserType(userType);
      }
    } catch (error) {
      loader.dismiss();
      const errorMessage = (error as Error).message;
  
      switch (errorMessage) {
        case 'Firebase: The password is invalid or the user does not have a password. (auth/wrong-password)':
        case 'Firebase: There is no user record corresponding to this identifier. The user may have been deleted. (auth/user-not-found)':
          this.presentToast('Invalid email or password');
          break;
        case 'Firebase: The email address is badly formatted. (auth/invalid-email)':
          this.presentToast('Incorrectly formatted email');
          break;
        default:
          this.presentToast('An unexpected error occurred.');
          break;
      }
    }
  }
  

  checkAdminCredentials(): boolean {
    return this.email === this.adminEmail && this.password === this.adminPassword;
  }

  async getUserType(): Promise<string> {
    const studentQuerySnapshot = await this.db.collection('registeredStudents')
      .ref.where('email', '==', this.email)
      .get();
    if (!studentQuerySnapshot.empty) {
      return 'student';
    }

    const staffQuerySnapshot = await this.db.collection('registered staff')
      .ref.where('email', '==', this.email).where('staffNumber', '==', this.password)
      .get();
    if (!staffQuerySnapshot.empty) {
      const staffDoc = staffQuerySnapshot.docs[0];
      const staffData = staffDoc.data() as staff;
      return staffData.position;
    }

    return 'unknown';
  }

  navigateBasedOnUserType(userType: string) {
    switch (userType) {
      case 'student':
        this.navController.navigateForward('/stude-scan');
        break;
      case 'lecturer':
        this.navController.navigateForward('/lecture');
        break;
      case 'dept-admin':
          this.navController.navigateForward('/dept-an');
          break;
      // case 'staff':
      //     this.navController.navigateForward('/lecture');
      //     break;

      default:
        alert('User not found in registeredStudents or registeredStaff collections.');
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
