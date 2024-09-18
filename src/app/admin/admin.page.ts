import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
})
export class AdminPage implements OnInit {

 
  fullName: string = '';
  staffNumber: string = '';
  email: string = '';
  position: string = '';
  department: string = '';

  constructor(
    private alertController: AlertController,
    private loadingController: LoadingController,
    private router: Router,
    private auth: AngularFireAuth,
    private toastController: ToastController,
    private navCtrl: NavController,
    private firestore: AngularFirestore
  ) {}

  ngOnInit(): void {}

  async submitForm() {
    const loader = await this.loadingController.create({
      message: 'Signing up',
      cssClass: 'custom-loader-class'
    });
    await loader.present();

    this.auth.createUserWithEmailAndPassword(this.email, this.staffNumber)
      .then(userCredential => {
        this.firestore.collection('registered staff').add({
          email: this.email,
          fullName: this.fullName,
          staffNumber: this.staffNumber,
          position: this.position,
          department: this.department,
        });
        loader.dismiss();
        this.router.navigateByUrl("/login");
        this.presentToast("successfully registered!");
      })
      .catch(error => {
        loader.dismiss();
        let errorMessage = error.message;

        switch (errorMessage) {
          case "Firebase: The email address is badly formatted. (auth/invalid-email).":
            alert("badly formatted email");
            break;
          case "Firebase: The email address is already in use by another account. (auth/email-already-in-use).":
            alert("invalid email or password");
            break;
          case "Firebase: There is no user record corresponding to this identifier. The user may have been deleted. (auth/user-not-found).":
            alert("invalid email");
            break;
          default:
            alert(errorMessage);
        }
      });
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 1500,
      position: 'top'
    });
    toast.present();
  }

}
