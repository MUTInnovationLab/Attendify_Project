import { Injectable } from '@angular/core';

// import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
// import { UserData } from './user-data.model'; // Adjust the import path as necessary
interface UserData {
  name: string;
  surname: string;
  studentNumber: string;
  email: string;
}
@Injectable({
  providedIn: 'root'
})
export class DataService {


  constructor(private firestore: AngularFirestore) {}

  getStudentByEmail(email: string): Observable<UserData[]> {
    return this.firestore.collection("registeredStudents", ref => ref.where('email', '==', email))
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as UserData;
          return {
            id: a.payload.doc.id,
            ...data
          } as UserData;
        }))
      );
  }
}
