import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ModalController } from '@ionic/angular';
import { AlertController } from '@ionic/angular';
import { ViewAnnouncementsComponent } from '../view-announcements/view-announcements.component';
import { ViewModalComponent } from '../view-modal/view-modal.component';
import { Router } from '@angular/router';

interface StudentData {
  email: string;
  name: string;
  studentNumber: string;
  surname: string;
  moduleCode: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  showUserInfo = false;
  currentUser: StudentData = { moduleCode: '', email: '', name: '', studentNumber: '', surname: '' };

  constructor(
    private auth: AngularFireAuth,
    private firestore: AngularFirestore,
    private modalController: ModalController,
    private alertController: AlertController,
    private router: Router
  ) {}

  toggleUserInfo() {
    this.showUserInfo = !this.showUserInfo;
  }

  ngOnInit() {
    this.getCurrentUser();
  }

  dismiss() {
    this.router.navigate(['/login']);
  }

  async openAnnouncementsModal() {
    const modal = await this.modalController.create({
      component: ViewAnnouncementsComponent
    });
    return await modal.present();
  }

  async presentViewModal() {
    const modal = await this.modalController.create({
      component: ViewModalComponent
    });
    return await modal.present();
  }

  getCurrentUser() {
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('User signed in:', user.email);
        this.firestore
          .collection('enrolledModules', (ref) =>
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
          disabled: true // Make module code non-editable
        },
        {
          name: 'studentNumber',
          type: 'text',
          placeholder: 'Student Number',
          value: this.currentUser.studentNumber,
          disabled: true // Make student number non-editable
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
          handler: async (data) => {
            if (data.email !== this.currentUser.email) {
              await this.updateEmail(data.email);
            }
            this.updateUserInfo(data);
          }
        }
      ]
    });

    await alert.present();
  }

  async updateEmail(newEmail: string) {
    try {
      const user = await this.auth.currentUser;
      if (user) {
        // Update email in Firebase Authentication
        await user.updateEmail(newEmail);
        console.log('Email updated in Firebase Authentication.');

        // Update email in Firestore for all related collections
        const collectionsToUpdate = ['enrolledModules', 'attendedStudents', 'registeredStudents'];
        collectionsToUpdate.forEach((collectionName) => {
          this.firestore
            .collection(collectionName, (ref) => ref.where('email', '==', this.currentUser.email))
            .get()
            .subscribe((querySnapshot) => {
              querySnapshot.forEach((doc) => {
                this.firestore
                  .collection(collectionName)
                  .doc(doc.id)
                  .update({ email: newEmail })
                  .then(() => {
                    console.log(`Email updated successfully in ${collectionName}`);
                  })
                  .catch((error) => {
                    console.error(`Error updating email in ${collectionName}:`, error);
                  });
              });
            });
        });

        // Update local email after successful updates
        this.currentUser.email = newEmail;
      }
    } catch (error) {
      console.error('Error updating email in Firebase Authentication:', error);
      // Optionally, you can show an alert or message to the user if the email update fails
    }
  }

  updateUserInfo(data: any) {
    const collectionsToUpdate = ['enrolledModules', 'attendedStudents', 'registeredStudents'];

    collectionsToUpdate.forEach((collectionName) => {
      // Update documents based on email, excluding studentNumber and moduleCode
      this.firestore
        .collection(collectionName, (ref) => ref.where('email', '==', this.currentUser.email))
        .get()
        .subscribe((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            const updatedData = {
              name: data.name,
              surname: data.surname,
              email: this.currentUser.email, // Keep email consistent after updates
              moduleCode: this.currentUser.moduleCode, // moduleCode remains unchanged
              studentNumber: this.currentUser.studentNumber // studentNumber remains unchanged
            };

            this.firestore
              .collection(collectionName)
              .doc(doc.id)
              .update(updatedData)
              .then(() => {
                console.log(`User info updated successfully in ${collectionName}`);

                // Re-fetch the user profile data after the update
                this.getCurrentUser();
              })
              .catch((error) => {
                console.error(`Error updating user info in ${collectionName}:`, error);
              });
          });
        });
    });

    // Optionally, update the local currentUser object immediately
    this.currentUser = { ...this.currentUser, ...data };
  }
}
