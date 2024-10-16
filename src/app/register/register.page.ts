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

  
  constructor(private alertController: AlertController, 
    private loadingController: LoadingController,
    private router: Router, 
    private auth: AngularFireAuth, 
    private toastController: ToastController,
    private navCtrl: NavController, 
    private firestore: AngularFirestore){}

  ngOnInit() {
  }

  goToPage() {
    this.navCtrl.navigateForward("/login");
  }

  async register() {
    if (this.email === "") {
      alert("Please enter your email.");
      return;
    }
    if (this.password === "") {
      alert("Please enter your password.");
      return;
    }
  
    // Simple regex for email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this.email)) {
      alert("Please enter a valid email address.");
      return;
    }
  
    const loader = await this.loadingController.create({
      message: 'Signing up',
      cssClass: 'custom-loader-class'
    });
    await loader.present();
  
    this.auth.createUserWithEmailAndPassword(this.email, this.password)
      .then(userCredential => {
        this.firestore.collection('registeredStudents').add({
          email: this.email,
          name: this.name,
          surname: this.surname,
          studentNumber: this.studentNumber,
        });
        loader.dismiss();
        this.router.navigateByUrl("/login");
        this.presentToast();
      })
      .catch(error => {
        loader.dismiss();
        const errorMessage = error.message;
  
        if (errorMessage === "Firebase: Error (auth/missing-email).") {
          alert("Email is missing.");
        } else if (errorMessage === "Firebase: The email address is badly formatted. (auth/invalid-email).") {
          alert("The email address is badly formatted.");
        } else if (errorMessage === "Firebase: The email address is already in use by another account. (auth/email-already-in-use).") {
          alert("This email is already in use.");
        } else if (errorMessage === "Firebase: There is no user record corresponding to this identifier. The user may have been deleted. (auth/user-not-found).") {
          alert("Invalid email.");
        } else {
          alert(errorMessage);
        }
      });
  }
  




  async presentToast() {
    const toast = await this.toastController.create({
      message: 'successfully registered!',
      duration: 1500,
      position: 'top'
    });

  }


}
