
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';

export interface Enrolled {
  status: string;
  studentNumber: string;
}

interface StudentData {
  department: string;
  studentNumber: string;
  name: string;
  surname: string;
  email: string;
}

// Add interface for module document structure
export interface ModuleDocument {
  Enrolled: Enrolled[];
  // Add other module properties here if any
}

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  constructor(private firestore: AngularFirestore) {}

  getStudentByEmail(email: string) {
    return this.firestore
      .collection<StudentData>('students', ref => 
        ref.where('email', '==', email))
      .valueChanges();
  }

  async checkStudentEnrollment(moduleCode: string, studentNumber: string): Promise<boolean> {
    try {
      // Specify the document type
      const moduleDoc = await this.firestore
        .collection('enrolledModules')
        .doc<ModuleDocument>(moduleCode)
        .get()
        .toPromise();

      if (!moduleDoc?.exists) {
        console.log('Module not found');
        return false;
      }

      // Get the data with proper typing
      const moduleData = moduleDoc.data() as ModuleDocument;
      if (!moduleData?.Enrolled) {
        console.log('No enrolled students found');
        return false;
      }

      // Now TypeScript knows the structure of enrollment
      const isEnrolled = moduleData.Enrolled.some((enrollment: Enrolled) =>
        enrollment.studentNumber === studentNumber && 
        enrollment.status === "Enrolled"
      );

      return isEnrolled;
    } catch (error) {
      console.error("Error checking enrollment:", error);
      throw new Error("Could not verify enrollment status");
    }
  }
}