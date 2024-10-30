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
  streams?: { [key: string]: Stream[] }; // Stream keys will be strings, each holding an array of Stream objects
}

interface Faculty {
  id: string;
  departments: Department[]; // An array of departments
}

@Injectable({
  providedIn: 'root'
})
export class FacultyService {
  constructor(private firestore: AngularFirestore) {}

  // Get all faculties
  getFaculties(): Observable<Faculty[]> {
    return this.firestore.collection('faculties').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Partial<Faculty>; // Allow optional properties
        return {
          id: a.payload.doc.id,
          ...data // Spread the data to include it in the object
        } as Faculty; // Cast to Faculty
      }))
    );
  }

  // Get a single faculty by ID
  getFaculty(facultyId: string): Observable<Faculty | null> {
    return this.firestore.doc<Faculty>(`faculties/${facultyId}`).valueChanges().pipe(
      map(faculty => faculty ?? null) // Convert undefined to null
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

      // Ensure streams object exists
      const department = faculty.departments[departmentIndex];
      if (!department.streams) {
        department.streams = {}; // Initialize streams as an empty object if undefined
      }

      // Add module to stream or department
      if (streamKey) {
        // Ensure the specific stream exists
        if (!department.streams[streamKey]) {
          department.streams[streamKey] = [{
            name: streamKey,
            modules: [] // Initialize modules array
          }];
        }

        // Access the modules array for the specified stream
        const modules = department.streams[streamKey][0].modules;

        // Check for duplicate module code
        if (modules) {
          const existingModule = modules.find(m => m.moduleCode === moduleData.moduleCode);
          
          if (existingModule) {
            throw new Error('Module with this code already exists in this stream');
          }

          // Push the new module to the modules array
          modules.push(moduleData);
        } else {
          throw new Error('Modules array is undefined'); // Safeguard against undefined
        }
      } else {
        // Ensure the modules array exists for the department
        if (!department.modules) {
          department.modules = []; // Initialize modules array if undefined
        }

        // Access the modules array for the department
        const modules = department.modules;

        // Check for duplicate module code
        const existingModule = modules.find(m => m.moduleCode === moduleData.moduleCode);
        
        if (existingModule) {
          throw new Error('Module with this code already exists in this department');
        }

        // Push the new module to the modules array
        modules.push(moduleData);
      }

      await facultyRef.set(faculty);
    } catch (error) {
      console.error('Error adding module:', error);
      throw error; // rethrowing the error to handle it outside if needed
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

      const department = faculty.departments[departmentIndex];

      if (streamKey) {
        // Ensure the stream exists
        const stream = department.streams?.[streamKey]?.[0];

        if (!stream || !stream.modules) {
          throw new Error('Stream or modules not found');
        }

        const modules = stream.modules;
        const moduleIndex = modules.findIndex(m => m.moduleCode === moduleCode);
        
        if (moduleIndex === -1) {
          throw new Error('Module not found');
        }

        // Remove the module
        modules.splice(moduleIndex, 1);
      } else {
        // Ensure the modules array exists for the department
        const modules = department.modules;

        if (!modules) {
          throw new Error('No modules found in department');
        }

        const moduleIndex = modules.findIndex(m => m.moduleCode === moduleCode);
        
        if (moduleIndex === -1) {
          throw new Error('Module not found');
        }

        // Remove the module
        modules.splice(moduleIndex, 1);
      }

      await facultyRef.set(faculty);
    } catch (error) {
      console.error('Error deleting module:', error);
      throw error; // rethrowing the error to handle it outside if needed
    }
  }
}
