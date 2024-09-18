import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ModalController } from '@ionic/angular';
import { AlertController } from '@ionic/angular';
import { ViewAnnouncementsComponent } from '../view-announcements/view-announcements.component';
// Adjust the path according to the actual location of the file




interface StudentData {
  email: string;
  name: string;
  studentNumber: string;
  surname: string;
  moduleCode:string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  showUserInfo = false;
  currentUser: StudentData = { email: '', name: '', studentNumber: '', surname: '' , moduleCode: ''};

  constructor(
    private auth: AngularFireAuth,
    private firestore: AngularFirestore,
    private modalController: ModalController,
    private alertController: AlertController,
    modalCtrl: ModalController
  ) {}

  toggleUserInfo() {
    this.showUserInfo = !this.showUserInfo;
  }

  ngOnInit() {
    this.getCurrentUser();
  }

  viewCalendar() {
    const url = 'assets/0206261057080 Thandeka Nkosi.pdf'; // path to your PDF file
    window.open(url, '_blank');
  }

  async openAnnouncementModal() {
    const modal = await this.modalController.create({ // Use this.modalController
      component: ViewAnnouncementsComponent
    });
    return await modal.present();
  }

  getCurrentUser() {
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('User signed in:', user.email);
        this.firestore
          .collection('registeredStudents', (ref) =>
            ref.where('email', '==', user.email)
          )
          .get()
          .subscribe(
            (querySnapshot) => {
              if (querySnapshot.empty) {
                console.log('No user found with this email');
              } else {
                querySnapshot.forEach((doc) => {
                  this.currentUser = doc.data() as StudentData;
                  console.log('Current User:', this.currentUser);
                });
              }
            },
            (error) => {
              console.error('Error fetching user data:', error);
            }
          );
      } else {
        console.log('No user is signed in');
      }
    });
  }

  async editUserInfo() {
    const alert = await this.alertController.create({
      header: 'Edit User Info',
      inputs: [
        {
          name: 'moduleCode',
          type: 'text',
          placeholder: 'CSK100',
          value: this.currentUser.moduleCode,
          disabled: true
        },
        {
          name: 'studentNumber',
          type: 'text',
          placeholder: 'Student Number',
          value: this.currentUser.studentNumber,
          // disabled: true // Make student number non-editable
        },
        {
          name: 'name',
          type: 'text',
          placeholder: 'Name',
          value: this.currentUser.name
        },
        {
          name: 'surname',
          type: 'text',
          placeholder: 'Surname',
          value: this.currentUser.surname
        },
        {
          name: 'email',
          type: 'email',
          placeholder: 'Email',
          value: this.currentUser.email
        }
      

      
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: (data) => {
            this.updateUserInfo(data);
          }
        }
      ]
    });

    await alert.present();
  }

  updateUserInfo(data: any) {
    this.firestore
      .collection('registeredStudents')
      .doc(this.currentUser.email) // Use student number as document ID
      .update(data)
      .then(() => {
        this.currentUser = { ...this.currentUser, ...data };
        console.log('User info updated successfully');
      })
      .catch((error) => {
        console.error('Error updating user info:', error);
      });
  }
}
