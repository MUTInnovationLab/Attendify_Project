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
  enrolledModules?: string[];
  pendingEmail?: string;
}

interface EnrolledEntry {
  studentNumber: string;
  status: string;
}

interface EnrolledModule {
  moduleCode: string;  // Assuming there's a field called 'moduleCode'
  Enrolled: EnrolledEntry[]; // Array of enrolled entries
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
        const userEmail = user.email; // Email for user information
        console.log('User signed in:', userEmail);
  
        // First, fetch user information using email
        this.firestore
          .collection('students', ref => ref.where('email', '==', user.email))
          .get()
          .subscribe(
            (querySnapshot) => {
              if (querySnapshot.empty) {
                console.log('No user found with this email');
              } else {
                querySnapshot.forEach((doc) => {
                  this.currentUser = doc.data() as StudentData;
                  console.log('Current User:', this.currentUser);
  
                  // After fetching current user, fetch modules using studentNumber
                  const studentNumber = this.currentUser.studentNumber;
                  this.fetchUserModules(studentNumber);
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
  
  async fetchUserModules(studentNumber: string): Promise<string[]> {
    const modules: string[] = [];
  
    try {
      // Fetch the enrolledModules collection
      const querySnapshot = await this.firestore.collection('enrolledModules').get().toPromise();
  
      if (querySnapshot) {
        // Iterate over each document in the snapshot
        querySnapshot.forEach(doc => {
          const moduleData = doc.data() as EnrolledModule;
  
          // Check if Enrolled array exists and is an array
          if (Array.isArray(moduleData.Enrolled)) {
            const isEnrolled = moduleData.Enrolled.some(entry => 
              entry && typeof entry === 'object' &&
              entry.studentNumber === studentNumber && 
              entry.status === 'Enrolled'
            );
  
            if (isEnrolled) {
              modules.push(moduleData.moduleCode); // Assuming moduleCode is the field to push
            }
          } else {
            console.warn(`Document ${doc.id} does not have a valid Enrolled array`);
          }
        });
      }
  
      console.log('User Modules:', modules);
      return modules;
    } catch (error) {
      console.error('Error fetching user modules:', error);
      return [];
    }
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
      const credential = firebase.auth.EmailAuthProvider.credential(user.email!, password);
      await user.reauthenticateWithCredential(credential);
      await user.verifyBeforeUpdateEmail(newEmail);
      this.currentUser.pendingEmail = newEmail;
      await this.updateUserInfo(this.currentUser);
      await this.showAlert('Email Verification Sent', 'A verification email has been sent to your new email address. Please verify it to complete the email update process.');
      console.log('Email verification sent successfully');
    } catch (error: any) {
      console.error('Error initiating email update:', error);
      this.handleAuthErrors(error);
    }
  }

  async updateEmailInFirestore(newEmail: string) {
    const collectionsToUpdate = ['enrolledModules', 'Attended', 'students','assignedLectures'];
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

    if (this.currentUser.enrolledModules) {
      for (const moduleCode of this.currentUser.enrolledModules) {
        const moduleRef = this.firestore.collection('enrolledModules').doc(moduleCode);
        const enrolledArray = moduleRef.get();
        
        if (enrolledArray) {
          enrolledArray.forEach((doc) => {
            batch.update(doc.ref, { email: newEmail });
          });
        }
      }
    }

    await batch.commit();
    this.currentUser.email = newEmail;
    console.log('Email updated successfully in Firestore');
  }

  
  async updateStudentNumber(newStudentNumber: string): Promise<boolean> {
    const batch = this.firestore.firestore.batch();
  
    try {
      // Ensure currentUser has a student number before proceeding
      const currentStudentNumber = this.currentUser?.studentNumber?.trim();
      if (!currentStudentNumber) {
        throw new Error("Current user has no student number");
      }
  
      console.log('Fetching document for student number:', currentStudentNumber);
  
      // 1. Update students collection by fetching the document using the student's current number as the document ID
      const studentRef = this.firestore.collection('students').doc(currentStudentNumber);
      const studentSnapshot = await studentRef.get().toPromise(); // Convert to promise
  
      // Check if the student document exists
      if (!studentSnapshot || !studentSnapshot.exists) {
        throw new Error('Student document does not exist for student number: ' + currentStudentNumber);
      }
  
      // Get the current student data
      const studentData = studentSnapshot.data() as { [key: string]: any };
  
      // Create a new document with the new student number
      const newStudentRef = this.firestore.collection('students').doc(newStudentNumber.trim());
      batch.set(newStudentRef.ref, {
        ...studentData, // Copy the existing student data
        studentNumber: newStudentNumber.trim() // Update the student number
      });
  
      // Delete the old document that has the old student number
      batch.delete(studentRef.ref);
  
      // 2. Update enrolledModules collection
      const modulesSnapshot = await this.firestore.collection('enrolledModules').get().toPromise(); // Convert to promise
  
      if (modulesSnapshot && !modulesSnapshot.empty) {
        for (const moduleDoc of modulesSnapshot.docs) {
          const moduleData = moduleDoc.data() as { Enrolled: Array<{ studentNumber: string }> };
  
          if (moduleData.Enrolled) {
            const updatedEnrolled = moduleData.Enrolled.map(student => {
              if (student.studentNumber === currentStudentNumber) {
                return { ...student, studentNumber: newStudentNumber.trim() };
              }
              return student;
            });
  
            // Update the enrolled students with the new student number
            batch.update(moduleDoc.ref, { Enrolled: updatedEnrolled });
          }
        }
      }
  
      // 3. Update Attended collection
      const attendedSnapshot = await this.firestore.collection('Attended').get().toPromise(); // Convert to promise
  
      if (attendedSnapshot && !attendedSnapshot.empty) {
        for (const attendedDoc of attendedSnapshot.docs) {
          const attendedData = attendedDoc.data() as { [date: string]: Array<{ studentNumber: string }> };
  
          // Loop through each date in the attendance records
          for (const [date, attendanceArray] of Object.entries(attendedData)) {
            if (Array.isArray(attendanceArray)) {
              const updatedAttendance = attendanceArray.map(record => {
                if (record.studentNumber === currentStudentNumber) {
                  return { ...record, studentNumber: newStudentNumber.trim() };
                }
                return record;
              });
  
              // Update the attendance records for this date
              batch.update(attendedDoc.ref, { [date]: updatedAttendance });
            }
          }
        }
      }
  
      // Commit the batch updates
      await batch.commit();
  
      // Update the local user object with the new student number
      this.currentUser.studentNumber = newStudentNumber.trim();
      console.log('Student number updated successfully in all collections');
  
      return true;
    } catch (error) {
      console.error('Error updating student number:', error);
      throw error;
    }
  }
  

  

  async checkPendingEmailUpdate() {
    const user = await this.auth.currentUser;
    if (user && this.currentUser.pendingEmail) {
      if (user.email === this.currentUser.pendingEmail) {
        await this.updateEmailInFirestore(this.currentUser.pendingEmail);
        delete this.currentUser.pendingEmail;
        await this.updateUserInfo({
          ...this.currentUser,
          email: this.currentUser.pendingEmail
        });
        this.showAlert('Email Updated', 'Your email has been successfully updated.');
      }
    }
  }
  


  async updateUserInfo(data: any) {
    const collectionsToUpdate = ['enrolledModules', 'attended', 'students','assignedLectures'];
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
          email: data.email
        };

        batch.update(doc.ref, updatedData);
      });
    }

    if (this.currentUser.enrolledModules) {
      for (const moduleCode of this.currentUser.enrolledModules) {
        const moduleRef = this.firestore.collection('enrolledModules').doc(moduleCode);
        const enrolledArray = moduleRef.get();
        
        if (enrolledArray) {
          enrolledArray.forEach((doc) => {
            batch.update(doc.ref, {
              studentNumber: data.studentNumber,
              email: data.email
            });
          });
        }
      }
    }

    await batch.commit();
    this.currentUser = { ...this.currentUser, ...data };
    console.log('User info updated successfully');
  }

  handleAuthErrors(error: any) {
    let errorMessage = '';
    switch (error.code) {
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password. Please try again.';
        break;
      case 'auth/email-already-in-use':
        errorMessage = 'This email is already in use by another account.';
        break;
      default:
        errorMessage = 'An error occurred. Please try again.';
        break;
    }
    this.showAlert('Error', errorMessage);
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
