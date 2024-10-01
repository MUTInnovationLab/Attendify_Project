import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AcademicCalendarService {
  constructor(private firestore: AngularFirestore) { }

  addEvent(event: any) {
    return this.firestore.collection('academic-events').add(event);
  }

  updateEvent(eventId: string, eventData: any) {
    return this.firestore.collection('academic-events').doc(eventId).update(eventData);
  }

  deleteAllEventsForYear(year: number): Promise<void> {
    const startDate = new Date(year, 0, 1); // January 1st of the given year
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st of the given year (last millisecond)
  
    return this.firestore.collection('academic-events', ref =>
      ref.where('date', '>=', startDate)
        .where('date', '<=', endDate)
    ).get().toPromise()
    .then(snapshot => {
      if (!snapshot || snapshot.empty) { // Check if snapshot is undefined or empty
        console.log(`No events found for the year ${year}`);
        return;
      }
  
      const batch = this.firestore.firestore.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
  
      return batch.commit();
    })
    .then(() => {
      console.log(`All events for ${year} deleted successfully`);
    })
    .catch(error => {
      console.error('Error deleting events: ', error);
      throw error;
    });
  }
  

  // New method to get all events for a specific year
  getEventsForYear(year: number): Observable<any[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    return this.firestore.collection('academic-events', ref =>
      ref.where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date')
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as any;
        const id = a.payload.doc.id;
        return { id, ...data };
      }))
    );
  }
}