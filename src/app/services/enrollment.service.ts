// import { Injectable } from '@angular/core';
// import { AngularFirestore } from '@angular/fire/compat/firestore';  // Correct import for compat API
// // import { EnrolledModule } from '../models/enrolled-module.model';  // Assuming this model exists
// export interface Enrolled {
//   status: string;
//   studentNumber: string;
// }

// export interface EnrolledModule {
//   moduleCode: string;
//   enrolled: Enrolled[];
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class EnrollmentService {
//   constructor(private firestore: AngularFirestore) {}

//   // Function to check if a student is enrolled in a specific module
//   async checkStudentEnrollment(moduleCode: string, studentNumber: string): Promise<boolean> {
//     try {
//       // Query Firestore for documents in the 'enrolledModules' collection where 'moduleCode' matches
//       const querySnapshot = await this.firestore.collection('enrolledModules', ref =>
//         ref.where('moduleCode', '==', moduleCode)
//       ).get().toPromise();

//       // Check if querySnapshot is valid and contains documents
//       if (querySnapshot && !querySnapshot.empty) {
//         // Assuming moduleCode is unique, get the first matching document
//         const docData = querySnapshot.docs[0].data() as EnrolledModule;

//         // Check if the student exists in the enrolled array
//         return docData.enrolled.some(enroll => enroll.studentNumber === studentNumber);
//       } else {
//         // No module found with the given moduleCode
//         return false;
//       }
//     } catch (error) {
//       console.error("Error checking student enrollment:", error);
//       throw new Error("Could not check enrollment at the moment.");
//     }
//   }
// }
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore'; // Correct import for compat API
// import { EnrolledModule, Enrolled } from '../models/enrolled-module.model'; // Assuming this model exists
export interface Enrolled {
  status: string;
  studentNumber: string;
}

export interface EnrolledModule {
  moduleCode: string;
  enrolled: Enrolled[];
}

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  constructor(private firestore: AngularFirestore) {}

  // Function to check if a student is enrolled in a specific module
  async checkStudentEnrollment(moduleCode: string, studentNumber: string): Promise<boolean> {
    try {
      // Query Firestore for documents in the 'enrolledModules' collection where 'moduleCode' matches
      const querySnapshot = await this.firestore.collection('enrolledModules', ref =>
        ref.where('moduleCode', '==', moduleCode)
      ).get().toPromise();

      // If no documents found, return false
      if (!querySnapshot || querySnapshot.empty) {
        return false;
      }

      // Loop through the documents (though we expect only one document, just in case)
      for (const doc of querySnapshot.docs) {
        const enrolledModule = doc.data() as EnrolledModule;

        // Ensure enrolledModule is valid and contains 'enrolled' array
        if (enrolledModule?.enrolled) {
          // Check if the student exists in the enrolled array
          const studentEnrolled = enrolledModule.enrolled.some((enroll: Enrolled) =>
            enroll.studentNumber === studentNumber
        
          );

          if (studentEnrolled) {
            return true;
          }
        }
      }

      // If no matching student is found, return false
      return false;

    } catch (error) {
      console.error("Error checking student enrollment:", error);
      throw new Error("Could not check enrollment at the moment. Please try again later.");
    }
  }
}
