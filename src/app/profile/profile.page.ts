import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ModalController, AlertController, LoadingController } from '@ionic/angular';
import { ViewAnnouncementsComponent } from '../view-announcements/view-announcements.component';
import { ViewModalComponent } from '../view-modal/view-modal.component';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app';

interface StudentData {
  email: string;
  name: string;
  studentNumber: string;
  surname: string;
  moduleCode?: string[];
  pendingEmail?: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  showUserInfo = false;
  currentUser: StudentData = { email: '', name: '', studentNumber: '', surname: '' };

  constructor(
    private auth: AngularFireAuth,
    private firestore: AngularFirestore,
    private modalController: ModalController,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private router: Router
  ) {}

  ngOnInit() {
    this.getCurrentUser();
  }

  toggleUserInfo() {
    this.showUserInfo = !this.showUserInfo;
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
          .collection('enrolledModules', ref => ref.where('email', '==', user.email))
          .get()
          .subscribe(
            (querySnapshot) => {
              if (querySnapshot.empty) {
                console.log('No user found with this email');
              } else {
                querySnapshot.forEach((doc) => {
                  this.currentUser = doc.data() as StudentData;
                  console.log('Current User:', this.currentUser);
                  this.checkPendingEmailUpdate();
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
          name: 'studentNumber',
          type: 'text',
          placeholder: 'Student Number',
          value: this.currentUser.studentNumber
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
        },
        {
          name: 'password',
          type: 'password',
          placeholder: 'Current password (required for email update)',
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
            const loading = await this.loadingController.create({
              message: 'Updating user information...'
            });
            await loading.present();

            try {
              if (data.email !== this.currentUser.email) {
                if (!data.password) {
                  loading.dismiss();
                  this.showAlert('Error', 'Password is required to update email.');
                  return false;
                }
                await this.initiateEmailUpdate(data.email, data.password);
              }
              if (data.studentNumber !== this.currentUser.studentNumber) {
                await this.updateStudentNumber(data.studentNumber);
              }
              await this.updateUserInfo(data);
              loading.dismiss();
              this.showAlert('Success', 'User information updated successfully.');
              return true;
            } catch (error: any) {
              loading.dismiss();
              this.showAlert('Error', error.message || 'Failed to update user information. Please try again.');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async initiateEmailUpdate(newEmail: string, password: string) {
    const user = await this.auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in.');
    }

    try {
      // Re-authenticate user
      const credential = firebase.auth.EmailAuthProvider.credential(user.email!, password);
      await user.reauthenticateWithCredential(credential);

      // Send verification email to the new email address
      await user.verifyBeforeUpdateEmail(newEmail);

      // Store the pending email update in Firestore
      this.currentUser.pendingEmail = newEmail;
      await this.updateUserInfo(this.currentUser);

      // Show an alert to inform the user about the verification email
      await this.showAlert('Email Verification Sent', 'A verification email has been sent to your new email address. Please verify it to complete the email update process.');

      console.log('Email verification sent successfully');
    } catch (error: any) {
      console.error('Error initiating email update:', error);
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('For security reasons, please log out and log back in before changing your email.');
      } else if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already in use by another account.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('The email address is badly formatted.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else {
        throw new Error('Failed to initiate email update. Please try again later.');
      }
    }
  }

  async updateEmailInFirestore(newEmail: string) {
    const collectionsToUpdate = ['enrolledModules', 'Attended', 'registeredStudents'];
    const batch = this.firestore.firestore.batch();

    for (const collectionName of collectionsToUpdate) {
      const querySnapshot = await this.firestore
        .collection(collectionName)
        .ref.where('email', '==', this.currentUser.email)
        .get();

      querySnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { email: newEmail });
      });
    }

    // Update in allModules collection for each module the student is enrolled in
    if (this.currentUser.moduleCode) {
      for (const moduleCode of this.currentUser.moduleCode) {
        const moduleRef = this.firestore.collection('allModules').doc(moduleCode);
        const studentsRef = moduleRef.collection(moduleCode);

        const studentQuerySnapshot = await studentsRef.ref.where('email', '==', this.currentUser.email).get();
        
        if (!studentQuerySnapshot.empty) {
          studentQuerySnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { email: newEmail });
          });
        }
      }
    }

    // Commit the batch
    await batch.commit();

    // Update local user object
    this.currentUser.email = newEmail;
    console.log('Email updated successfully in Firestore');
  }

  async updateStudentNumber(newStudentNumber: string) {
    const collectionsToUpdate = ['enrolledModules', 'Attended', 'registeredStudents'];
    const batch = this.firestore.firestore.batch();

    for (const collectionName of collectionsToUpdate) {
      const querySnapshot = await this.firestore
        .collection(collectionName)
        .ref.where('email', '==', this.currentUser.email)
        .get();

      querySnapshot.docs.forEach((doc) => {
        // Update the studentNumber field
        batch.update(doc.ref, { studentNumber: newStudentNumber });

        // If it's the enrolledModules collection, we need to update the document ID as well
        if (collectionName === 'enrolledModules') {
          const oldData = doc.data() as StudentData;
          const newDocRef = this.firestore.collection('enrolledModules').doc(newStudentNumber);
          
          // Set the data in the new document
          batch.set(newDocRef.ref, {
            ...oldData,
            studentNumber: newStudentNumber
          });

          // Delete the old document
          batch.delete(doc.ref);
        }
      });
    }

    // Update in allModules collection for each module the student is enrolled in
    if (this.currentUser.moduleCode) {
      for (const moduleCode of this.currentUser.moduleCode) {
        const moduleRef = this.firestore.collection('allModules').doc(moduleCode);
        const studentsRef = moduleRef.collection(moduleCode);

        const studentQuerySnapshot = await studentsRef.ref.where('email', '==', this.currentUser.email).get();
        
        if (!studentQuerySnapshot.empty) {
          studentQuerySnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { studentNumber: newStudentNumber });
          });
        }
      }
    }

    // Commit the batch
    await batch.commit();

    // Update local user object
    this.currentUser.studentNumber = newStudentNumber;
    console.log('Student number updated successfully in all collections');
  }


  async checkPendingEmailUpdate() {
    const user = await this.auth.currentUser;
    if (user && this.currentUser.pendingEmail) {
      if (user.email === this.currentUser.pendingEmail) {
        // Email has been successfully updated in Authentication
        await this.updateEmailInFirestore(this.currentUser.pendingEmail);
        
        // Remove pendingEmail field now that it's confirmed
        delete this.currentUser.pendingEmail;
        
        // Update Firestore with the new email and removal of pendingEmail
        await this.updateUserInfo({
          ...this.currentUser,
          email: this.currentUser.pendingEmail // Make sure email is updated
        });
  
        this.showAlert('Email Updated', 'Your email has been successfully updated.');
      }
    }
  }
  
  async updateUserInfo(data: any) {
    const collectionsToUpdate = ['enrolledModules', 'attendedStudents', 'registeredStudents', 'allModules'];
    const batch = this.firestore.firestore.batch();
  
    for (const collectionName of collectionsToUpdate) {
      const querySnapshot = await this.firestore
        .collection(collectionName)
        .ref.where('email', '==', this.currentUser.email)
        .get();
  
      querySnapshot.docs.forEach((doc) => {
        const updatedData: Partial<StudentData> = {
          name: data.name,
          surname: data.surname,
          studentNumber: data.studentNumber,
          email: data.email // Make sure to update the email field directly
        };
  
        // If it's the enrolledModules collection, handle it differently
        if (collectionName !== 'registeredStudents') {
          const currentData = doc.data() as StudentData;
          if (currentData.moduleCode) {
            updatedData.moduleCode = currentData.moduleCode;
          }
        }
  
        batch.update(doc.ref, updatedData);
      });
    }
  
    // Update in allModules collection for each module the student is enrolled in
    if (this.currentUser.moduleCode) {
      for (const moduleCode of this.currentUser.moduleCode) {
        const moduleRef = this.firestore.collection('allModules').doc(moduleCode);
        const studentsRef = moduleRef.collection(moduleCode);
  
        const studentQuerySnapshot = await studentsRef.ref.where('email', '==', this.currentUser.email).get();
        
        if (!studentQuerySnapshot.empty) {
          studentQuerySnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
              name: data.name,
              surname: data.surname,
              studentNumber: data.studentNumber,
              email: data.email // Update the email field in modules
            });
          });
        }
      }
    }
  
    // Commit the batch
    await batch.commit();
  
    // Update local user object
    this.currentUser = { ...this.currentUser, ...data };
    console.log('User information updated successfully in Firestore');
  }
  

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}