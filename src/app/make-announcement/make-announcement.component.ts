import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../services/auth.service';
import firebase from 'firebase/compat/app';

@Component({
  selector: 'app-make-announcement',
  templateUrl: './make-announcement.component.html',
  styleUrls: ['./make-announcement.component.scss']
})
export class MakeAnnouncementComponent implements OnInit {
  @Input() moduleCode: string = '';
  title: string = '';
  content: string = '';
  moduleDetails: any;
  showAddStudentsModal: boolean = true;

  constructor(
    private modalController: ModalController,
    private firestore: AngularFirestore,
    private authService: AuthService,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    if (this.moduleCode) {
      try {
        const moduleQuery = this.firestore.collection('modules', ref => 
          ref.where('moduleCode', '==', this.moduleCode)
        );
        const moduleSnapshot = await moduleQuery.get().toPromise();

        if (moduleSnapshot && !moduleSnapshot.empty) {
          this.moduleDetails = moduleSnapshot.docs[0].data();
          console.log('Module details:', this.moduleDetails);
        } else {
          console.error('No module found with the provided moduleCode.');
        }
      } catch (error) {
        console.error('Error fetching module details:', error);
      }
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  async submitAnnouncement() {
    if (this.title.trim() && this.content.trim() && this.moduleCode.trim()) {
      const timestamp = new Date();
      const formattedDate = `${timestamp.getFullYear()}-${timestamp.getMonth() + 1}-${timestamp.getDate()}`;

      try {
        const user = await this.authService.getCurrentUser();
        const userEmail = user ? user.email : '';

        if (userEmail) {
          const announcement = {
            title: this.title,
            content: this.content,
            timestamp: timestamp,
            formattedDate: formattedDate,
            userEmail: userEmail
          };

          // Get reference to the module's announcements document
          const moduleAnnouncementsRef = this.firestore.doc(`announcements/${this.moduleCode}`);
          
          // Get the current document
          const docSnapshot = await moduleAnnouncementsRef.get().toPromise();
          
          if (docSnapshot?.exists) {
            // If document exists, update the announcements array using firebase.firestore.FieldValue
            await moduleAnnouncementsRef.update({
              announcements: firebase.firestore.FieldValue.arrayUnion(announcement)
            });
          } else {
            // If document doesn't exist, create it with initial announcement
            await moduleAnnouncementsRef.set({
              moduleCode: this.moduleCode,
              announcements: [announcement]
            });
          }

          console.log('Announcement submitted:', announcement);

          // Reset the form fields
          this.title = '';
          this.content = '';

          this.presentToast('Announcement added successfully!');
        } else {
          console.error('User email is not available!');
        }
      } catch (error) {
        console.error('Error submitting announcement:', error);
        this.presentToast('Failed to add the announcement. Please try again.');
      }
    } else {
      console.error('Title, content, and module code are required!');
      this.presentToast('All fields are required!');
    }
  }

  closeAddStudentsModal() {
    this.showAddStudentsModal = false;
  }

  dismiss() {
    this.modalController.dismiss().catch(err => {
      console.error('Error dismissing modal:', err);
    });
  }
}