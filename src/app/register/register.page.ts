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

  email: string="";
  name: string="";
  surname: string="";
  studentNumber: string="";
  password: string="";

  // constructor(private afAuth: AngularFireAuth, private firestore: AngularFirestore,private navCtrl: NavController) {}
  constructor(private alertController: AlertController, private loadingController: LoadingController,
    private router: Router, private auth: AngularFireAuth, private toastController: ToastController,
    private navCtrl: NavController, private firestore: AngularFirestore){}

  ngOnInit() {
  }

  goToPage() {
    this.navCtrl.navigateForward("/login");
  }

  async register() {
    if(this.email == ""){
      alert("Please enter email");
      return;
    }
    if(this.password == ""){
      alert("Please enter password");
      return;
    }
  
    const loader = await this.loadingController.create({
      message: 'Signing up',
      cssClass: 'custom-loader-class'
    });
    await loader.present();
  
    this.auth.createUserWithEmailAndPassword(this.email, this.password)
      .then(async userCredential => {
        const user = userCredential.user;
  
        if (user) {
          // Store user data in Firestore with the user's UID
          await this.firestore.collection('registeredStudents').doc(user.uid).set({
            uid: user.uid,
            email: this.email,
            name: this.name,
            surname: this.surname,
            studentNumber: this.studentNumber
          });
  
          loader.dismiss();
          this.router.navigateByUrl("/login");
          this.presentToast('Successfully registered!');
        }
      })
      .catch(error => {
        loader.dismiss();
        this.handleRegisterError(error);
      });
  }
  
  handleRegisterError(error: any) {
    const errorMessage = error.message;
    switch (errorMessage) {
      case 'Firebase: Error (auth/missing-email).':
        alert("Please provide an email address.");
        break;
      case 'Firebase: The email address is badly formatted. (auth/invalid-email).':
        alert("The email address is badly formatted.");
        break;
      case 'Firebase: The email address is already in use by another account. (auth/email-already-in-use).':
        alert("The email address is already in use.");
        break;
      default:
        alert(errorMessage);
        break;
    }
  }
  
  async presentToast(p0: string) {
    const toast = await this.toastController.create({
      message: 'successfully registered!',
      duration: 1500,
      position: 'top'
    });

  }


}
