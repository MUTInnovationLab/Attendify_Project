import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular'; // Import ToastController
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../services/auth.service'; // Adjust the path as necessary

@Component({
  selector: 'app-make-announcement',
  templateUrl: './make-announcement.component.html',
  styleUrls: ['./make-announcement.component.scss']
})
export class MakeAnnouncementComponent implements OnInit {
  @Input() moduleCode: string = ''; // Receive moduleCode as an input
  title: string = '';
  content: string = '';
  moduleDetails: any; // To store the fetched module details
  showAddStudentsModal: boolean = true; // Flag to control modal visibility

  constructor(
    private modalController: ModalController, // Inject ModalController
    private firestore: AngularFirestore,
    private authService: AuthService,
    private toastController: ToastController // Inject ToastController
  ) {}

  async ngOnInit() {
    if (this.moduleCode) {
      try {
        // Fetch module details using the moduleCode
        const moduleQuery = this.firestore.collection('modules', ref => ref.where('moduleCode', '==', this.moduleCode));
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

  // Method to show a toast notification
  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000, // Duration the toast will be visible (2 seconds)
      position: 'bottom' // You can change to 'top', 'middle' as per your design needs
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
            moduleCode: this.moduleCode,
            timestamp: timestamp,
            formattedDate: formattedDate,
            userEmail: userEmail
          };

          await this.firestore.collection('announcements').add(announcement);
          console.log('Announcement submitted:', announcement);

          // Reset the form fields
          this.title = '';
          this.content = '';

          // Show success message via toast
          this.presentToast('Announcement added successfully!');
        } else {
          console.error('User email is not available!');
        }
      } catch (error) {
        console.error('Error submitting announcement:', error);
        // Show error message via toast
        this.presentToast('Failed to add the announcement. Please try again.');
      }
    } else {
      console.error('Title, content, and module code are required!');
      // Show error message via toast
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
