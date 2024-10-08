import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { ModalController } from '@ionic/angular'; 

// Define interfaces for data models
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
  moduleCode: string[]; // Assuming moduleCode is an array
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
      // Get the currently logged-in user's email
      const user = await this.afAuth.currentUser;
      if (user) {
        this.studentEmail = user.email;

        if (this.studentEmail) {
          // Fetch the module codes for the student
          const moduleCodes = await this.getStudentModuleCodes(this.studentEmail);
          console.log('Module codes for student:', moduleCodes); // Log fetched module codes

          if (moduleCodes.length > 0) {
            // Fetch announcements related to the student's module codes
            const announcementsSnapshot = await this.firestore.collection<Announcement>('announcements', ref => 
              ref.where('moduleCode', 'in', moduleCodes)
                 .orderBy('timestamp', 'desc')
            ).get().toPromise();

            if (announcementsSnapshot && !announcementsSnapshot.empty) {
              const announcements = announcementsSnapshot.docs.map(doc => {
                const data = doc.data() as Announcement;
                return {
                  ...data,
                  userEmail: data.userEmail,
                };
              });

              // Fetch full names for each announcement's userEmail
              await Promise.all(announcements.map(async (announcement) => {
                announcement.userEmail = await this.getFullNameByEmail(announcement.userEmail);
              }));

              this.announcements = announcements;
            } else {
              console.log('No announcements found for the given module codes:', moduleCodes);
            }
          } else {
            console.log('No modules found for the student with email:', this.studentEmail);
          }
        } else {
          console.log('No email found for the logged-in user.');
        }
      } else {
        console.log('No user is logged in.');
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  }

  async getStudentModuleCodes(email: string): Promise<string[]> {
    try {
      console.log('Fetching module codes for email:', email);

      const studentSnapshot = await this.firestore.collection<StudentRegistration>('enrolledModules', ref => 
        ref.where('email', '==', email)
      ).get().toPromise();

      if (studentSnapshot && !studentSnapshot.empty) {
        console.log('Number of student documents found:', studentSnapshot.size);
        
        const moduleCodes: string[] = [];
        studentSnapshot.docs.forEach(doc => {
          const data = doc.data() as StudentRegistration;
          console.log('Document data:', data);  // Log each document's data
          if (data.moduleCode) {
            moduleCodes.push(...data.moduleCode); // Collect all module codes
          }
        });
        
        console.log('Module codes:', moduleCodes);
        return moduleCodes;
      } else {
        console.log('No student found with email:', email);
        return [];
      }
    } catch (error) {
      console.error('Error fetching student module codes:', error);
      return [];
    }
  }

  async getFullNameByEmail(email: string): Promise<string> {
    try {
      const staffSnapshot = await this.firestore.collection<RegisteredStaff>('registeredStaff', ref => 
        ref.where('email', '==', email)
      ).get().toPromise();
      
      if (staffSnapshot && !staffSnapshot.empty) {
        const staffDoc = staffSnapshot.docs[0].data();
        return staffDoc.fullName || 'Unknown';
      } else {
        console.log('No staff found with email:', email);
        return 'Unknown';
      }
    } catch (error) {
      console.error('Error fetching full name:', error);
      return 'Unknown';
    }
  }

  dismiss() {
    this.modalController.dismiss().catch(err => {
      console.error('Error dismissing modal:', err);
    });
  }
}
