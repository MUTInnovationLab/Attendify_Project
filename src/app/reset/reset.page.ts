import { Component, OnInit } from "@angular/core";
import { ToastController } from "@ionic/angular";
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router, ActivatedRoute } from '@angular/router';

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
  actionCode: string = '';
  
  constructor(
    private afAuth: AngularFireAuth,
    private toastController: ToastController,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Check if this page was loaded with an action code (oobCode) in the URL
    this.route.queryParams.subscribe(params => {
      this.actionCode = params['oobCode'] || '';
      
      if (this.actionCode) {
        // Verify the action code is valid
        this.verifyActionCode();
      }
    });
  }

  // Verify the password reset code
  async verifyActionCode() {
    try {
      // Verify the password reset code is valid
      await this.afAuth.verifyPasswordResetCode(this.actionCode);
      // If valid, move to password reset step
      this.currentStep = 3;
    } catch (error) {
      console.error('Invalid or expired action code', error);
      this.presentToast('The password reset link has expired or is invalid. Please request a new one.');
      this.currentStep = 1;
    }
  }

  async sendResetEmail() {
    if (!this.email) {
      this.presentToast('Please enter your email address.');
      return;
    }

    try {
      // Use Firebase's built-in password reset email functionality
      await this.afAuth.sendPasswordResetEmail(this.email);
      this.currentStep = 2;
    } catch (error) {
      console.error('Error sending reset email:', error);
      this.presentToast('Failed to send reset email. Please verify your email address and try again.');
    }
  }

  goToNewPassword() {
    // This function is now optional since Firebase's email will take the user directly to step 3
    this.currentStep = 3;
  }

  async resetPassword() {
    if (this.newPassword !== this.confirmPassword) {
      this.presentToast('Passwords do not match.');
      return;
    }

    if (!this.actionCode) {
      this.presentToast('Invalid or expired reset link.');
      return;
    }

    try {
      // Confirm the password reset with Firebase
      await this.afAuth.confirmPasswordReset(this.actionCode, this.newPassword);
      this.presentToast('Password reset successful.');
      this.currentStep = 4;
    } catch (error) {
      console.error('Error during password reset:', error);
      this.presentToast('Failed to reset password. The link may have expired.');
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