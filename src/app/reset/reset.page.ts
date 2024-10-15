// import { Component, OnInit } from '@angular/core';
// import { AngularFireAuth } from '@angular/fire/compat/auth';
// import { LoadingController, NavController, ToastController } from '@ionic/angular';

import { Component, OnInit } from "@angular/core";
import { AuthService } from "../services/auth.service";
import { ToastController } from "@ionic/angular";

@Component({
  selector: 'app-reset',
  templateUrl: './reset.page.html',
  styleUrls: ['./reset.page.scss'],
})
// export class ResetPage implements OnInit {
//   email: string = '';

//   constructor(private auth: AngularFireAuth,
//     private navController: NavController,
//     private loadingController: LoadingController,
//     private toastController: ToastController) { }

//   ngOnInit() {
//   }

  
//     async resetPassword() {
//       if (!this.email) {
//         this.presentToast('Please enter your email address.');
//         return;
//       }
  
//       const loader = await this.loadingController.create({
//         message: 'Sending reset email...',
//         cssClass: 'custom-loader-class'
//       });
  
//       try {
//         await loader.present();
//         await this.auth.sendPasswordResetEmail(this.email);
//         loader.dismiss();
//         this.presentToast('Password reset email sent. Please check your inbox.');
//         this.navController.navigateBack('/login');
//       } catch (error) {
//         loader.dismiss();
//         const errorMessage = (error as Error).message;
//         this.presentToast('An error occurred: ' + errorMessage);
//       }
//     }
  
//     async presentToast(message: string) {
//       const toast = await this.toastController.create({
//         message: message,
//         duration: 3000,
//         color: 'danger'
//       });
//       toast.present();
//     }
//   }


export class ResetPage implements OnInit {
  currentStep = 1;
  email: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  constructor(private authService: AuthService, private toastController: ToastController) {}

  ngOnInit() {}

  async sendResetEmail() {
    if (this.email) {
      try {
        await this.authService.sendPasswordResetEmail(this.email);
        this.currentStep = 2;
      } catch (error) {
        this.presentToast('Failed to send reset email. Please try again.');
      }
    } else {
      this.presentToast('Please enter your email address.');
    }
  }

  goToNewPassword() {
    this.currentStep = 3;
  }

  async resetPassword() {
    if (this.newPassword !== this.confirmPassword) {
      this.presentToast('Passwords do not match.');
      return;
    }
    try {
      // Implement your password reset logic here
      // This might involve calling an API or a service method
      // await this.authService.resetPassword(this.email, this.newPassword);
      this.currentStep = 4;
    } catch (error) {
      this.presentToast('Failed to reset password. Please try again.');
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }
}