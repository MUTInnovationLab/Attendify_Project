import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class FacultyDepartmentService {
  constructor(private firestore: AngularFirestore) {}

  // Fetch all faculties
  getFaculties(): Observable<string[]> {
    return this.firestore.collection('faculties').snapshotChanges().pipe(
      map(actions =>
        actions.map(a => a.payload.doc.id) // Retrieve the document IDs as faculty names
      )
    );
  }

  // Fetch departments for a specific faculty
  getDepartments(facultyName: string): Observable<string[]> {
    return this.firestore.collection('faculties').doc(facultyName).valueChanges().pipe(
        map((facultyData: any) => {
            // Access each 'department' and retrieve 'modules' name fields
            return facultyData?.departments?.map((department: any) => department.name) || [];
        })
    );
}

}

































// import { Injectable } from '@angular/core';
// import { AngularFirestore } from '@angular/fire/compat/firestore';
// import { Observable, of } from 'rxjs';
// import { map, catchError } from 'rxjs/operators';

// interface Module {
//   moduleCode: string;
//   moduleName: string;
//   moduleLevel: string;
// }

// interface Stream {
//   modules: Module[];
// }

// interface Department {
//   name: string;
//   modules: {
//     name: string;
//     streams: {
//       [key: string]: {
//         modules: Module[];
//       };
//     };
//   };
// }

// interface Faculty {
//   name: string;
//   departments: Department[];
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class FacultyDepartmentService {
//   constructor(private firestore: AngularFirestore) {}

//   getFaculties(): Observable<string[]> {
//     return this.firestore.collection<Faculty>('faculties').get().pipe(
//       map(snapshot =>
//         snapshot.docs.map(doc => (doc.data() as Faculty).name)
//       ),
//       catchError(error => {
//         console.error('Error loading faculties:', error);
//         return of([]);
//       })
//     );
//   }

//   getDepartmentsForFaculty(facultyName: string): Observable<string[]> {
//     return this.firestore.collection<Faculty>('faculties').get().pipe(
//       map(snapshot => {
//         const faculty = snapshot.docs.find(doc => (doc.data() as Faculty).name === facultyName);
//         if (faculty) {
//           const data = faculty.data() as Faculty;
//           return data.departments.map(department => department.name); // Only return department names
//         }
//         return [];
//       }),
//       catchError(error => {
//         console.error('Error loading departments for faculty:', error);
//         return of([]);
//       })
//     );
//   }
  
// }
