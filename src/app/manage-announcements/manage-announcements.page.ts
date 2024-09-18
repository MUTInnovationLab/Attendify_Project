import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-manage-announcements',
  templateUrl: './manage-announcements.page.html',
  styleUrls: ['./manage-announcements.page.scss'],
})
export class ManageAnnouncementsPage implements OnInit {
  announcementTitle: string = '';
  announcementContent: string = '';
  modules: any[] = [];
  selectedModule: string = '';
  announcements: any[] = [];
  userEmail: string = '';

  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth
  ) {}

  ngOnInit() {
    this.loadUser();
  }

  async loadUser() {
    const user = await this.auth.currentUser;
    if (user) {
      this.userEmail = user.email || '';
      this.loadStaffModules(this.userEmail);
    }
  }

  loadStaffModules(userEmail: string) {
    this.firestore.collection('modules', ref => ref.where('userEmail', '==', userEmail))
      .valueChanges()
      .subscribe((modules: any[]) => {
        this.modules = modules.map(module => module.moduleCode);
      });
  }

  async submitAnnouncement() {
    if (this.selectedModule && this.announcementTitle && this.announcementContent) {
      const currentDate = new Date();
      await this.firestore.collection('announcements').add({
        moduleCode: this.selectedModule,
        title: this.announcementTitle,
        content: this.announcementContent,
        timestamp: currentDate,
        formattedDate: currentDate.toLocaleString()
      });
      this.announcementTitle = '';
      this.announcementContent = '';
      this.loadAnnouncements();
    }
  }

  loadAnnouncements() {
    if (this.selectedModule) {
      this.firestore.collection('announcements', ref => 
        ref.where('moduleCode', '==', this.selectedModule).orderBy('timestamp', 'desc'))
        .valueChanges()
        .subscribe(data => this.announcements = data);
    }
  }

  deleteAnnouncement(index: number) {
    this.announcements.splice(index, 1);
  }
}
