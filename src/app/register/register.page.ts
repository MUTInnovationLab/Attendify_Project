import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AlertController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';

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
  department: string = ""; // Assuming this is captured in your form
  password: string = "";

  constructor(private alertController: AlertController, 
  private loadingController: LoadingController,
  private router: Router, 
  private auth: AngularFireAuth, 
  private toastController: ToastController,
  private navCtrl: NavController, 
  private firestore: AngularFirestore) {}

  ngOnInit() {}

  goToPage() {
    this.navCtrl.navigateForward("/login");
  }

  async register() {
    if (this.email === "") {
      this.presentToast('Please enter your email.', 'danger');
      return;
    }
    if (this.password === "") {
      this.presentToast('Please enter your password.', 'danger');
      return;
    }

    // Simple regex for email validation
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

    this.auth.createUserWithEmailAndPassword(this.email, this.password)
      .then(userCredential => {
        // Save the student's data using studentNumber as the document ID
        this.firestore.collection('students').doc(this.studentNumber).set({
          email: this.email,
          name: this.name,
          surname: this.surname,
          studentNumber: this.studentNumber,
          department: this.department  // Assuming this is captured in your form
        });
        loader.dismiss();
        this.presentToast('Successfully registered!', 'success');
        this.router.navigateByUrl("/login");
      })
      .catch(error => {
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
      });
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

}