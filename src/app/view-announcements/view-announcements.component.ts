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
  email: string;
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
  studentEmail: string | null = null;

  constructor(
    private firestore: AngularFirestore,
    private modalController: ModalController,
    private afAuth: AngularFireAuth
  ) {}

  async ngOnInit() {
    try {
      const user = await this.afAuth.currentUser;
      if (user && user.email) {
        this.studentEmail = user.email;
        const moduleCodes = await this.getStudentModuleCodes(this.studentEmail);
        
        if (moduleCodes.length > 0) {
          await this.fetchAnnouncements(moduleCodes);
        } else {
          console.log('No modules found for the student with email:', this.studentEmail);
        }
      } else {
        console.log('No user is logged in or email is missing.');
      }
    } catch (error) {
      console.error('Error in ngOnInit:', error);
    }
  }

  async getStudentModuleCodes(email: string): Promise<string[]> {
    try {
      const studentSnapshot = await this.firestore.collection<StudentRegistration>('enrolledModules')
        .ref.where('email', '==', email).get();

      if (!studentSnapshot.empty) {
        const moduleCodes: string[] = [];
        studentSnapshot.docs.forEach(doc => {
          const data = doc.data() as StudentRegistration;
          if (Array.isArray(data.moduleCode)) {
            moduleCodes.push(...data.moduleCode);
          }
        });
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
      const staffSnapshot = await this.firestore.collection<RegisteredStaff>('registeredStaff')
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