import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {
  private announcementsCollection = this.firestore.collection<any>('announcements');

  constructor(private firestore: AngularFirestore) {}

  getAnnouncements(): Observable<any[]> {
    return this.announcementsCollection.valueChanges();
  }

  addAnnouncement(announcement: any): Observable<void> {
    const id = this.firestore.createId(); // Generate a unique ID for the announcement
    return new Observable(observer => {
      this.announcementsCollection.doc(id).set(announcement).then(() => {
        observer.next();
        observer.complete();
      }).catch(error => observer.error(error));
    });
  }
}
