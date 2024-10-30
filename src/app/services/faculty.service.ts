import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface Module {
  moduleName: string;
  moduleCode: string;
  moduleLevel: string;
  credits?: number;
  year?: number;
}

interface Stream {
  name: string;
  modules: Module[];
}

interface Department {
  name: string;
  modules?: Module[];
  streams?: { [key: string]: Stream[] };
}

interface Faculty {
  id: string;
  departments: Department[];
}

@Injectable({
  providedIn: 'root'
})


export class FacultyService {
  constructor(private firestore: AngularFirestore) {}

  // Get all faculties
  ggetFaculties(): Observable<Faculty[]> {
    return this.firestore.collection('faculties').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Partial<Faculty>; // Use Partial to allow for optional properties
        return {
          id: a.payload.doc.id,
          ...data 
        } as Faculty;
      }))
    );
  }

  // Get a single faculty by ID
  getFaculty(facultyId: string): Observable<Faculty | null> {
    return this.firestore.doc<Faculty>(`faculties/${facultyId}`).valueChanges().pipe(
      map(faculty => faculty ?? null) 
    );
  }
  
  // Add or update a module
  async addModule(facultyId: string, departmentName: string, moduleData: Module, streamKey?: string): Promise<void> {
    const facultyRef = this.firestore.collection('faculties').doc(facultyId);
    
    try {
      const doc = await facultyRef.get().toPromise();
      if (!doc?.exists) {
        throw new Error('Faculty not found');
      }

      const faculty = doc.data() as Faculty;
      const departmentIndex = faculty.departments.findIndex(d => d.name === departmentName);
      
      if (departmentIndex === -1) {
        throw new Error('Department not found');
      }

      if (streamKey) {
        // Add to stream
        if (!faculty.departments[departmentIndex].streams) {
          faculty.departments[departmentIndex].streams = {};
        }
        
        if (!faculty.departments[departmentIndex].streams![streamKey]) {
          faculty.departments[departmentIndex].streams![streamKey] = [{
            name: streamKey,
            modules: []
          }];
        }

        // Check for duplicate module code
        const existingModule = faculty.departments[departmentIndex].streams![streamKey][0].modules
          .find(m => m.moduleCode === moduleData.moduleCode);
        
        if (existingModule) {
          throw new Error('Module with this code already exists in this stream');
        }

        faculty.departments[departmentIndex].streams![streamKey][0].modules.push(moduleData);
      } else {
        // Add to department
        if (!faculty.departments[departmentIndex].modules) {
          faculty.departments[departmentIndex].modules = [];
        }

        // Check for duplicate module code
        const existingModule = faculty.departments[departmentIndex].modules!
          .find(m => m.moduleCode === moduleData.moduleCode);
        
        if (existingModule) {
          throw new Error('Module with this code already exists in this department');
        }

        faculty.departments[departmentIndex].modules!.push(moduleData);
      }

      await facultyRef.set(faculty);
    } catch (error) {
      throw error;
    }
  }

  // Delete a module
  async deleteModule(facultyId: string, departmentName: string, moduleCode: string, streamKey?: string): Promise<void> {
    const facultyRef = this.firestore.collection('faculties').doc(facultyId);
    
    try {
      const doc = await facultyRef.get().toPromise();
      if (!doc?.exists) {
        throw new Error('Faculty not found');
      }

      const faculty = doc.data() as Faculty;
      const departmentIndex = faculty.departments.findIndex(d => d.name === departmentName);
      
      if (departmentIndex === -1) {
        throw new Error('Department not found');
      }

      if (streamKey) {
        // Delete from stream
        if (!faculty.departments[departmentIndex].streams?.[streamKey]?.[0].modules) {
          throw new Error('Stream not found');
        }

        const moduleIndex = faculty.departments[departmentIndex].streams[streamKey][0].modules
          .findIndex(m => m.moduleCode === moduleCode);
        
        if (moduleIndex === -1) {
          throw new Error('Module not found');
        }

        faculty.departments[departmentIndex].streams[streamKey][0].modules.splice(moduleIndex, 1);
      } else {
        // Delete from department
        if (!faculty.departments[departmentIndex].modules) {
          throw new Error('No modules found in department');
        }

        const moduleIndex = faculty.departments[departmentIndex].modules
          .findIndex(m => m.moduleCode === moduleCode);
        
        if (moduleIndex === -1) {
          throw new Error('Module not found');
        }

        faculty.departments[departmentIndex].modules.splice(moduleIndex, 1);
      }

      await facultyRef.set(faculty);
    } catch (error) {
      throw error;
    }
  }
}



