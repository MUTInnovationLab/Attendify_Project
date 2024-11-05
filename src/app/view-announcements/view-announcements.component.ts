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
  formattedDate?: string;
  isDeleted?: boolean; // Add a flag to track if the announcement is deleted locally
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
      const snapshot = await this.firestore.collection<StudentDocument>('students', ref => ref.where('email', '==', email)).get().toPromise();
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

      console.log('Student enrolled in modules:', enrolledModules);
      return enrolledModules;
    } catch (error) {
      console.error('Error fetching student module codes:', error);
      return [];
    }
  }

  async fetchAnnouncements(moduleCodes: string[]) {
    try {
      console.log('Fetching announcements for module codes:', moduleCodes);

      const announcementChunks = this.chunkArray(moduleCodes, 10);
      let allAnnouncements: Announcement[] = [];

      for (const chunk of announcementChunks) {
        console.log('Processing chunk:', chunk);

        const announcementsSnapshot = await this.firestore.collection<Announcement>('announcements', ref =>
          ref.where('moduleCode', 'in', chunk).orderBy('timestamp', 'desc')
        ).get().toPromise();

        if (announcementsSnapshot && !announcementsSnapshot.empty) {
          const announcements = announcementsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              formattedDate: this.formatDate(data.timestamp),
              isDeleted: false // Initialize as not deleted
            } as Announcement;
          });
          allAnnouncements = allAnnouncements.concat(announcements);
        } else {
          console.log('No announcements found for chunk:', chunk);
        }
      }

      this.announcements = allAnnouncements;
      console.log('Announcements fetched successfully:', this.announcements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  }

  formatDate(timestamp: firebase.firestore.Timestamp): string {
    const date = timestamp.toDate();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  onAnnouncementClick(announcement: Announcement) {
    // Handle click event, you can show a detailed view if needed
    console.log('Announcement clicked:', announcement);
  }

  deleteAnnouncement(announcement: Announcement, event: MouseEvent) {
    event.stopPropagation(); // Prevent triggering the click event on the parent element
    announcement.isDeleted = true; // Mark the announcement as deleted locally
    console.log('Announcement marked for deletion:', announcement);
  }

  dismiss() {
    this.modalController.dismiss().catch(err => {
      console.error('Error dismissing modal:', err);
    });
  }
}
