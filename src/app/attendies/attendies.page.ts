import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/compat/auth';

interface Module {
  id: string;
  moduleCode: string;
  moduleLevel: string;
  moduleName: string;
  userEmail: string;
  place?: string;
  selected?: boolean;
}

interface AttendedStudent {
  email: string;
  module: string;
  scanDate: string;
}

interface AttendanceData {
  [key: string]: string[]; // scanDate as key and array of emails as value
}

@Component({
  selector: 'app-attendies',
  templateUrl: './attendies.page.html',
  styleUrls: ['./attendies.page.scss'],
})
export class AttendiesPage implements OnInit, OnDestroy {
  attendedStudents: any[] = []; 
  showAttendedTable: boolean = false; 
  students: any[] = []; 
  showTable: boolean = false; 
  requestedInvites: any[] = [];
  showRequestsTable = false;
  modules: any[] = []; 
  moduleName: string = ''; 
  attendanceSubscription!: Subscription; 
  requestedInvitesSubscription!: Subscription; 
  studentsInModule: any;
  selectedModule: Module | null = null; 
  currentLecturerEmail: string | null = null;

  constructor(
    private firestore: AngularFirestore,
    private toastController: ToastController,
    private afAuth: AngularFireAuth
  ) {}

  async ngOnInit() {
    try {
      const user = await this.afAuth.currentUser;
      if (user) {
        this.currentLecturerEmail = user.email || '';
        
        // Fetch modules associated with the current lecturer
        await this.fetchModulesForLecturer();
        
        // Fetch attendance data for modules
        await this.fetchAttendedStudents();

        // Fetch pending requests for modules
        for (const module of this.modules) {
          await this.fetchPendingRequests(module.moduleCode, module.moduleName);
        }
      }
    } catch (error) {
      console.error('Error fetching lecturer details:', error);
    }
  }

  async fetchModulesForLecturer() {
    try {
      const lecturerDoc = await this.firestore.collection('registered staff', ref =>
        ref.where('email', '==', this.currentLecturerEmail)
      ).get().toPromise();
  
      if (lecturerDoc && !lecturerDoc.empty) {
        const lecturerData = lecturerDoc.docs[0].data();
        console.log('Lecturer data:', lecturerData);
  
        const lecturerModules = await this.firestore.collection('modules', ref =>
          ref.where('userEmail', '==', this.currentLecturerEmail)
        ).get().toPromise();
  
        if (lecturerModules && !lecturerModules.empty) {
          const lecturerDetails = lecturerModules.docs.map(doc => doc.data());
  
          // Log module details
          console.log('Lecturer Modules:', lecturerDetails);
  
          lecturerDetails.forEach((lecturer: any) => {
            this.moduleName = lecturer.moduleName.trim(); 
            console.log('Set Module Name:', this.moduleName);
            this.fetchPendingRequests(lecturer.moduleCode, lecturer.moduleName);
          });
        } else {
          console.log('No modules found for the lecturer.');
        }
      } else {
        console.log('Lecturer details not found.');
      }
    } catch (error) {
      console.error('Error fetching modules for lecturer:', error);
    }
  }

  async fetchAttendedStudents() {
    try {
      const modulesSnapshot = await this.firestore.collection('modules', ref =>
        ref.where('userEmail', '==', this.currentLecturerEmail)
      ).get().toPromise();

      if (!modulesSnapshot || modulesSnapshot.empty) {
        console.log('No modules found for the lecturer.');
        this.students = [];
        return;
      }

      const moduleCodes = modulesSnapshot.docs.map(doc => {
        const moduleData = doc.data() as Module;
        return moduleData.moduleCode;
      });
      console.log('Module codes:', moduleCodes);

      const attendedData: AttendedStudent[] = [];

      for (const moduleCode of moduleCodes) {
        console.log(`Fetching attendance data for module code: ${moduleCode}`);

        const attendedDoc = await this.firestore.collection('Attended')
          .doc(moduleCode)
          .get().toPromise();

        if (attendedDoc && attendedDoc.exists) {
          const dates = attendedDoc.data() as AttendanceData;
          console.log('Attendance data for module code:', moduleCode, dates);

          Object.keys(dates).forEach(scanDate => {
            const emailArray = dates[scanDate];
            emailArray.forEach(email => {
              if (email) {
                attendedData.push({
                  email,
                  module: moduleCode,
                  scanDate: scanDate
                });
              }
            });
          });
        } else {
          console.log(`No attendance data found for module ${moduleCode}.`);
        }
      }

      this.students = attendedData;
      console.log('Attended students data:', this.students);
    } catch (error) {
      console.error('Error fetching attended students data:', error);
      this.students = [];
    }
  }

  groupByModuleAndDate(students: any[]): any[] {
    const groupedData: { module: string; scanDate: string; emails: string[] }[] = [];
  
    students.forEach(student => {
      const existingGroup = groupedData.find(group => group.module === student.module && group.scanDate === student.scanDate);
  
      if (existingGroup) {
        existingGroup.emails.push(student.email);
      } else {
        groupedData.push({
          module: student.module,
          scanDate: student.scanDate,
          emails: [student.email]
        });
      }
    });
  
    return groupedData;
  }

  async fetchPendingRequests(moduleCode: string, moduleName: string) {
    if (!moduleCode || !moduleName) {
      console.warn('Module code or module name is missing.');
      return;
    }

    try {
      console.log(`Fetching pending requests for module: ${moduleCode}, module name: ${moduleName}`);
      
      // Correct subcollection name
      const correctModuleName = this.moduleName || moduleName;
      
      const requestsSnapshot = await this.firestore.collection('allModules')
        .doc(moduleCode)
        .collection(correctModuleName, ref => ref.where('status', '==', 'pending'))
        .get()
        .toPromise();

      if (requestsSnapshot && !requestsSnapshot.empty) {
        this.requestedInvites.push(...requestsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
        console.log('Pending requests data:', this.requestedInvites);
      } else {
        console.log(`No pending requests data found for module ${moduleCode}.`);
      }

      this.showRequestsTable = this.requestedInvites.length > 0;

    } catch (error) {
      console.error('Error fetching pending requests data:', error);
      this.requestedInvites = [];
      this.showRequestsTable = false; 
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
    console.log('Module Name:', this.moduleName);
    console.log('Module Code:', request.moduleCode);
    console.log('Student Number:', request.studentNumber);
  
    if (!this.moduleName || !request.moduleCode || !request.studentNumber) {
      console.warn('Module name, module code, or student number is missing.');
      await this.presentToast('Error updating student status. Required information is missing.', 'danger');
      return;
    }
  
    const updatedStudent = { status };
  
    try {
      const documentPath = `allModules/${request.moduleCode}/${this.moduleName}/${request.studentNumber}`;
      console.log('Updating document at path:', documentPath);
  
      await this.firestore.collection('allModules')
        .doc(request.moduleCode)
        .collection(this.moduleName) 
        .doc(request.studentNumber)
        .update(updatedStudent);
  
      const requestIndex = this.requestedInvites.findIndex(req => req.id === request.id);
      if (requestIndex > -1) {
        this.requestedInvites.splice(requestIndex, 1);
      }
      await this.presentToast(`${status.charAt(0).toUpperCase() + status.slice(1)} student successfully.`, 'success');
    } catch (error) {
      console.error(`Error updating student status to ${status}:`, error);
      await this.presentToast('Error updating student status. Please try again.', 'danger');
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
      duration: 2000,
    });
    toast.present();
  }
}
