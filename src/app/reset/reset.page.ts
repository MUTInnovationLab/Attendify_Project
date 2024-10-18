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
      // Inform the user to reset via email, no direct password update needed here
      this.presentToast('Please check your email to reset your password.');
      this.currentStep = 4; // Move to a confirmation or another appropriate step
    } catch (error) {
      console.error('Error during password reset:', error);
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