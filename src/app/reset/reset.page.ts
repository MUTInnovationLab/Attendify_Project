import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { LoadingController, NavController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-reset',
  templateUrl: './reset.page.html',
  styleUrls: ['./reset.page.scss'],
})
export class ResetPage implements OnInit {
  email: string = '';

  constructor(private auth: AngularFireAuth,
    private navController: NavController,
    private loadingController: LoadingController,
    private toastController: ToastController) { }

  ngOnInit() {
  }

  
    async resetPassword() {
      if (!this.email) {
        this.presentToast('Please enter your email address.');
        return;
      }
  
      const loader = await this.loadingController.create({
        message: 'Sending reset email...',
        cssClass: 'custom-loader-class'
      });
  
      try {
        await loader.present();
        await this.auth.sendPasswordResetEmail(this.email);
        loader.dismiss();
        this.presentToast('Password reset email sent. Please check your inbox.');
        this.navController.navigateBack('/login');
      } catch (error) {
        loader.dismiss();
        const errorMessage = (error as Error).message;
        this.presentToast('An error occurred: ' + errorMessage);
      }
    }
  
    async presentToast(message: string) {
      const toast = await this.toastController.create({
        message: message,
        duration: 3000,
        color: 'danger'
      });
      toast.present();
    }
  }
