import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-attendies',
  templateUrl: './attendies.page.html',
  styleUrls: ['./attendies.page.scss'],
})
export class AttendiesPage implements OnInit, OnDestroy {
  students: any[] = []; // Array to store all student data
  showTable: boolean = false; // Flag to toggle attendance table visibility
  requestedInvites: any[] = []; // Array to store requested invites
  showRequestsTable: boolean = false; // Flag to toggle requested invites table visibility
  moduleName: string = "Dev Soft 1"; // Default module name
  moduleCode: string = "CF100"; // Default module code
  scanDate: string = "Thu Aug 01 2024"; // Default scan date
  attendanceSubscription!: Subscription; // Subscription for attendance data
  requestedInvitesSubscription!: Subscription; // Subscription for requested invites data

  constructor(private firestore: AngularFirestore, private toastController: ToastController) {}

  // Fetch all students and pending requests on component initialization
  ngOnInit() {
    this.fetchAllStudents(this.moduleCode, this.moduleName); // Fetch all students from a specific module
    // this.fetchPendingRequests(this.moduleCode, this.moduleName); // Fetch requested invites
    this.fetchAllStudents(this.moduleCode, this.scanDate); // Fetch all students from a specific module and date
  
    this.fetchPendingRequests();
  }

  // Fetch all attended students from a specific module and date
  async fetchAllStudents(moduleCode: string, scanDate: string) {
    try {
      const studentsSnapshot = await this.firestore.collection('AttendedStudents')
        .doc(moduleCode) // Module code document
        .collection(scanDate) // Date subcollection
        .get()
        .toPromise();

      if (studentsSnapshot && !studentsSnapshot.empty) {
        this.students = studentsSnapshot.docs.map(doc => doc.data());
        console.log('Attended students data:', this.students);
      } else {
        console.log('No attended students data found.');
        this.students = [];
      }
    } catch (error) {
      console.error('Error fetching attended students data:', error);
      this.students = [];
    }
  }

  async fetchPendingRequests(moduleCode: string = 'DS100', moduleName: string = 'Dev Soft 1') {
    try {
      const requestsSnapshot = await this.firestore.collection('allModules')
        .doc(moduleCode)
        .collection(moduleName, ref => ref.where('status', '==', 'pending'))
        .get()
        .toPromise();
      if (requestsSnapshot && !requestsSnapshot.empty) {
        this.requestedInvites = requestsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        console.log('Pending requests data:', this.requestedInvites);
      } else {
        console.log('No pending requests data found.');
        this.requestedInvites = [];
      }
    } catch (error) {
      console.error('Error fetching pending requests data:', error);
      this.requestedInvites = [];
    }
  }

  // Toggle visibility of the attendance table
  toggleTable() {
    this.showTable = !this.showTable;
  }

  // Toggle visibility of the requested invites table
  toggleRequestsTable() {
    this.showRequestsTable = !this.showRequestsTable;
  }

  // Update student status to either 'active' or 'declined'
  async updateStudentStatus(request: any, status: string) {
    const updatedStudent = { status };

    try {
      await this.firestore.collection("allModules")
        .doc(request.moduleCode)
        .collection(this.moduleName)
        .doc(request.studentNumber)
        .update(updatedStudent);

      const requestIndex = this.requestedInvites.findIndex(req => req.id === request.id);
      this.requestedInvites.splice(requestIndex, 1);
      this.presentToast(`${status.charAt(0).toUpperCase() + status.slice(1)} student successfully.`, 'success');
    } catch (error) {
      console.error(`Error updating student status to ${status}:`, error);
      this.presentToast(`Error updating student status. Please try again.`, 'danger');
    }
  }

  // Approve a student request
  approveStudent(request: any) {
    this.updateStudentStatus(request, 'active');
  }

  // Decline a student request
  declineStudent(request: any) {
    this.updateStudentStatus(request, 'declined');
  }

  // Unsubscribe from observables when the component is destroyed
  ngOnDestroy() {
    if (this.attendanceSubscription) {
      this.attendanceSubscription.unsubscribe();
    }
    if (this.requestedInvitesSubscription) {
      this.requestedInvitesSubscription.unsubscribe();
    }
  }

  // Show a toast message
  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 2000
    });
    toast.present();
  }
}




