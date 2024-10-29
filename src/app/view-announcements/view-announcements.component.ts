import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { ModalController } from '@ionic/angular';

interface Announcement {
  moduleCode: string;
  timestamp: firebase.firestore.Timestamp;
  title: string;
  content: string;
  userEmail: string;
  formattedDate: string;
}

interface StudentRegistration {
  studentNumber: string; // Ensure this matches your Firestore structure
  moduleCode: string[];
}

interface RegisteredStaff {
  email: string;
  fullName: string;
}

@Component({
  selector: 'app-view-announcements',
  templateUrl: './view-announcements.component.html',
  styleUrls: ['./view-announcements.component.scss']
})
export class ViewAnnouncementsComponent implements OnInit {
  announcements: Announcement[] = [];
  studentNumber: string | null = null;

  constructor(
    private firestore: AngularFirestore,
    private modalController: ModalController,
    private afAuth: AngularFireAuth
  ) {}

  async ngOnInit() {
    try {
      const user = await this.afAuth.currentUser;
      if (user) {
        // Fetch the student registration data from Firestore
        this.studentNumber = await this.getStudentNumber(user.uid); // Use user.uid to fetch from Firestore

        if (this.studentNumber) {
          const moduleCodes = await this.getStudentModuleCodes(this.studentNumber);
          
          if (moduleCodes.length > 0) {
            await this.fetchAnnouncements(moduleCodes);
          } else {
            console.log('No modules found for the student with number:', this.studentNumber);
          }
        } else {
          console.log('Student number is null.');
        }
      } else {
        console.log('No user is logged in.');
      }
    } catch (error) {
      console.error('Error in ngOnInit:', error);
    }
  }

  // Function to retrieve the student number from Firestore based on the user's UID
  async getStudentNumber(uid: string): Promise<string | null> {
    try {
      const userSnapshot = await this.firestore.collection<StudentRegistration>('students') // Adjust the collection name as needed
        .ref.where('uid', '==', uid).limit(1).get();

      if (!userSnapshot.empty) {
        return userSnapshot.docs[0].data().studentNumber; // Ensure this field exists in your Firestore data
      }
      return null;
    } catch (error) {
      console.error('Error fetching student number:', error);
      return null;
    }
  }

  async getStudentModuleCodes(studentNumber: string): Promise<string[]> {
    try {
      const studentSnapshot = await this.firestore.collection<StudentRegistration>('enrolledModules')
        .ref.where('studentNumber', '==', studentNumber).get();
      
      console.log('Student snapshot:', studentSnapshot.docs);

      if (!studentSnapshot.empty) {
        const moduleCodes: string[] = [];
        studentSnapshot.docs.forEach(doc => {
          const data = doc.data() as StudentRegistration;
          if (Array.isArray(data.moduleCode)) {
            moduleCodes.push(...data.moduleCode);
          }
        });
        console.log('Module Codes:', moduleCodes);
        return moduleCodes;
      }
      return [];
    } catch (error) {
      console.error('Error fetching student module codes:', error);
      return [];
    }
  }

  async fetchAnnouncements(moduleCodes: string[]) {
    try {
      const announcementsSnapshot = await this.firestore.collection<Announcement>('announcements')
        .ref.where('moduleCode', 'in', moduleCodes).orderBy('timestamp', 'desc').get();

      if (!announcementsSnapshot.empty) {
        this.announcements = await Promise.all(announcementsSnapshot.docs.map(async doc => {
          const data = doc.data() as Announcement;
          const fullName = await this.getFullNameByEmail(data.userEmail);
          return {
            ...data,
            userEmail: fullName,
            formattedDate: this.formatDate(data.timestamp)
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  }

  async getFullNameByEmail(email: string): Promise<string> {
    try {
      const staffSnapshot = await this.firestore.collection<RegisteredStaff>('staff')
        .ref.where('email', '==', email).limit(1).get();

      if (!staffSnapshot.empty) {
        return staffSnapshot.docs[0].data().fullName || email;
      }
      return email;
    } catch (error) {
      console.error('Error fetching full name:', error);
      return email;
    }
  }

  formatDate(timestamp: firebase.firestore.Timestamp): string {
    return timestamp.toDate().toLocaleString();
  }

  dismiss() {
    this.modalController.dismiss().catch(err => {
      console.error('Error dismissing modal:', err);
    });
  }
}
