import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Injectable({
  providedIn: 'root'
})
export class AcademicCalendarService {

  constructor(private firestore: AngularFirestore) { }

  addEvent(event: any) {
    return this.firestore.collection('academic-events').add(event);
  }
}
