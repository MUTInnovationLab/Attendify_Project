// faculty.service.ts
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FacultyService {
  constructor(private firestore: AngularFirestore) {}

  // Get all faculties
  getFaculties(): Observable<string[]> {
    return this.firestore.collection('faculties').snapshotChanges().pipe(
      map(actions => actions.map(a => a.payload.doc.id))
    );
  }

  // Get departments for a specific faculty
  getDepartments(facultyName: string): Observable<string[]> {
    return this.firestore.doc(`faculties/${facultyName}`).valueChanges().pipe(
      map((faculty: any) => {
        if (faculty && faculty.Departments) {
          return faculty.Departments.map((dept: { name: any; }) => dept.name);
        }
        return [];
      })
    );
  }

  // Get streams for a specific faculty and department
  getStreams(facultyName: string, departmentName: string): Observable<string[]> {
    return this.firestore.doc(`faculties/${facultyName}`).valueChanges().pipe(
      map((faculty: any) => {
        if (faculty && faculty.Departments) {
          const department = faculty.Departments.find((dept: { name: string; }) => dept.name === departmentName);
          if (department && department.streams) {
            return Object.keys(department.streams);
          }
        }
        return [];
      })
    );
  }

  // Get modules for a specific stream
  getModules(facultyName: string, departmentName: string, streamName: string): Observable<any[]> {
    return this.firestore.doc(`faculties/${facultyName}`).valueChanges().pipe(
      map((faculty: any) => {
        if (faculty && faculty.Departments) {
          const department = faculty.Departments.find((dept: { name: string; }) => dept.name === departmentName);
          if (department && department.streams && department.streams[streamName]) {
            return department.streams[streamName];
          }
        }
        return [];
      })
    );
  }

  // Add new module
  async addModule(data: any): Promise<void> {
    const facultyDocRef = this.firestore.collection('faculties').doc(data.facultyName);
    const docSnapshot = await facultyDocRef.get().toPromise();
  
    if (docSnapshot && docSnapshot.exists) { // Check if docSnapshot is defined and exists
      const facultyData: any = docSnapshot.data();
      let department = facultyData.Departments.find((dept: { name: any; }) => dept.name === data.departmentName);
  
      if (!department) {
        facultyData.Departments.push({
          name: data.departmentName,
          streams: {}
        });
        department = facultyData.Departments[facultyData.Departments.length - 1];
      }
  
      const streamName = data.streamName || 'No Stream';
      if (!department.streams[streamName]) {
        department.streams[streamName] = [];
      }
  
      department.streams[streamName].push({
        module: data.moduleName,
        credits: data.credits,
        year: data.year
      });
  
      return facultyDocRef.set(facultyData);
    } else {
      const newFacultyData = {
        Departments: [{
          name: data.departmentName,
          streams: {
            [data.streamName || 'No Stream']: [{
              module: data.moduleName,
              credits: data.credits,
              year: data.year
            }]
          }
        }]
      };
      return facultyDocRef.set(newFacultyData);
    }
  }
}  