import { Component, Input, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../services/auth.service';
import { ToastController, ModalController } from '@ionic/angular'; // Add ModalController import

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
    private navCtrl: NavController,
    private firestore: AngularFirestore,
    private authService: AuthService,
    private toastController: ToastController, // ToastController injection
    private modalController: ModalController // ModalController injection
  ) {}

  async ngOnInit() {
    if (this.moduleCode) {
      try {
        const moduleQuery = await this.firestore.collection('assignedLectures')
          .doc(this.moduleCode)
          .get()
          .toPromise();

        if (moduleQuery && moduleQuery.exists) {
          this.moduleDetails = moduleQuery.data();
          console.log('Module details:', this.moduleDetails);
        } else {
          console.error('No module found with the provided moduleCode.');
        }
      } catch (error) {
        console.error('Error fetching module details:', error);
      }
    }
  }

  // Toast message method
  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color,
      cssClass: 'custom-toast'
    });
    toast.present();
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

          await this.firestore.collection('announcements').doc(this.moduleCode).set(announcement);
          console.log('Announcement submitted:', announcement);
          
          // Show success message
          await this.presentToast('Announcement submitted successfully!');

          this.title = '';
          this.content = '';
          
          // Optional: Navigate back after successful submission
          this.dismiss();
        } else {
          await this.presentToast('User email is not available!', 'danger');
          console.error('User email is not available!');
        }
      } catch (error) {
        await this.presentToast('Error submitting announcement. Please try again.', 'danger');
        console.error('Error submitting announcement:', error);
      }
    } else {
      await this.presentToast('Title, content, and module code are required!', 'warning');
      console.error('Title, content, and module code are required!');
    }
  }

  closeAddStudentsModal() {
    this.showAddStudentsModal = false;
  }

  dismiss() {
    this.modalController.dismiss().catch((err: any) => {
      console.error('Error dismissing modal:', err);
    });
  }
}













  
