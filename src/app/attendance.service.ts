// Import the necessary Firestore functions from the modular SDK
import { Firestore, collection, query, where, getDocs, updateDoc, addDoc, arrayUnion } from '@angular/fire/firestore';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  constructor(private firestore: Firestore) {}  // Use Firestore from '@angular/fire/firestore'

  async recordAttendance(moduleCode: string, attendanceDetails: any, studentEmail: string) {
    try {
      // Query the Firestore collection to check if a document with the same moduleCode and scanDate exists
      const q = query(
        collection(this.firestore, 'Attended'),  // Use 'this.firestore' correctly
        where('moduleCode', '==', moduleCode),
        where('scanDate', '==', attendanceDetails.scanDate)
      );

      // Await the result of the query
      const moduleSnapshot = await getDocs(q);  // Ensure this is awaited

      if (!moduleSnapshot.empty) {
        
        moduleSnapshot.forEach(async (doc) => {
          const docRef = doc.ref;  
          await updateDoc(docRef, {
            students: arrayUnion(studentEmail),  // Add the email to the 'students' array
            details: attendanceDetails  // Update other details as needed
          });
        });
        console.log('Attendance updated successfully:', attendanceDetails);
      } else {
        // If no document exists, create a new document
        await addDoc(collection(this.firestore, 'Attended'), {
          moduleCode: moduleCode,
          scanDate: attendanceDetails.scanDate,
          students: [studentEmail],  
          details: attendanceDetails
        });
        console.log('New attendance record created:', attendanceDetails);
      }
    } catch (error) {
      console.error('Error storing attendance details:', error);
    }
  }
}
