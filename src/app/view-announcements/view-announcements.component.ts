import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { ModalController } from '@ionic/angular';

interface Announcement {
  content: string;
  formattedDate: string;
  moduleCode: string;
  timestamp: firebase.firestore.Timestamp;
  title: string;
  userEmail: string;
}

interface AnnouncementDocument {
  announcements: Announcement[];
}

interface StudentEnrollment {
  studentNumber: string;
  status: string;
}

interface EnrolledModuleDocument {
  moduleCode: string;
  Enrolled: StudentEnrollment[];
}

interface StudentDocument {
  email: string;
  studentNumber: string;
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
      if (!user) {
        console.log('No user is logged in.');
        return;
      }

      this.studentNumber = await this.getStudentNumber(user.email);
      if (!this.studentNumber) {
        console.log('Student number not found');
        return;
      }

      const moduleCodes = await this.getStudentModuleCodes(this.studentNumber);
      console.log('Module codes fetched for student:', moduleCodes);

      if (moduleCodes.length > 0) {
        await this.fetchAnnouncements(moduleCodes);
      } else {
        console.log('No modules found for student:', this.studentNumber);
      }
    } catch (error) {
      console.error('Error in ngOnInit:', error);
    }
  }

  async getStudentNumber(email: string | null): Promise<string | null> {
    if (!email) return null;

    try {
      const snapshot = await this.firestore.collection<StudentDocument>('students', ref => 
        ref.where('email', '==', email)
      ).get().toPromise();
      
      if (snapshot && !snapshot.empty) {
        return snapshot.docs[0].data().studentNumber || null;
      }
      console.log('No student document found for email:', email);
      return null;
    } catch (error) {
      console.error('Error fetching student number:', error);
      return null;
    }
  }

  async getStudentModuleCodes(studentNumber: string): Promise<string[]> {
    try {
      const moduleSnapshot = await this.firestore.collection<EnrolledModuleDocument>('enrolledModules').get().toPromise();
      const enrolledModules: string[] = [];

      if (moduleSnapshot) {
        moduleSnapshot.forEach(doc => {
          const data = doc.data();
          const isEnrolled = data.Enrolled?.some(enrollment =>
            enrollment.studentNumber === studentNumber &&
            enrollment.status.toLowerCase() === 'enrolled'
          );

          if (isEnrolled && data.moduleCode) {
            enrolledModules.push(data.moduleCode);
          }
        });
      }

      return enrolledModules;
    } catch (error) {
      console.error('Error fetching student module codes:', error);
      return [];
    }
  }

  async fetchAnnouncements(moduleCodes: string[]) {
    try {
      let allAnnouncements: Announcement[] = [];

      // Fetch announcements for each module code
      for (const moduleCode of moduleCodes) {
        const docRef = this.firestore.doc<AnnouncementDocument>(`announcements/${moduleCode}`);
        const doc = await docRef.get().toPromise();
        
        if (doc?.exists) {
          const data = doc.data();
          if (data && Array.isArray(data.announcements)) {
            // Add each announcement from the array to our results
            const moduleAnnouncements = data.announcements.map((announcement: Announcement) => ({
              ...announcement,
              moduleCode // Ensure moduleCode is included
            }));
            allAnnouncements = allAnnouncements.concat(moduleAnnouncements);
          }
        }
      }

     // Sort announcements by timestamp in descending order (newest first)
      this.announcements = allAnnouncements.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return b.timestamp.seconds - a.timestamp.seconds;
        }
        return 0;
      });

      console.log('Announcements fetched successfully:', this.announcements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  }

  dismiss() {
    this.modalController.dismiss().catch(err => {
      console.error('Error dismissing modal:', err);
    });
  }
}