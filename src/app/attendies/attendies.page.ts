import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import 'firebase/compat/firestore';
import firebase from 'firebase/compat/app';


interface Module {
  id: string;
  moduleCode: string;
  moduleLevel: string;
  moduleName: string;
  userEmail: string;
  place?: string;
  selected?: boolean;
}

interface AttendanceData {
  [key: string]: string[]; // scanDate as key and array of emails as value
}

interface AttendedStudent {
  email: string;
  module: string;
  scanDate: string;
  name: string;
  surname: string;
  studentNumber: string;
  count: number;
}

interface GroupedStudent {
  module: string;
  dates: {
    date: string;
    students: Array<{
      email: string;
      name: string;
      surname: string;
      studentNumber: string;
      count: number;
    }>;
  }[];
}

interface Student {
  email: string;
  name: string;
  studentNumber: string;
  surname: string;
}

interface GroupedByDate {
  date: string;
  modules: {
    moduleCode: string;
    students: {
      email: string;
      name: string;
      surname: string;
      studentNumber: string;
      count: number;
    }[];
  }[];
}

@Component({
  selector: 'app-attendies',
  templateUrl: './attendies.page.html',
  styleUrls: ['./attendies.page.scss'],
})
export class AttendiesPage implements OnInit, OnDestroy {
  attendedStudents: any[] = []; 
  // groupedStudents: any[] = [];
  showAttendedTable: boolean = false; 
  students: AttendedStudent[] = [];
  groupedStudents: GroupedStudent[] = [];
  showTable = true;
  expandedGroups: { [key: string]: boolean } = {};
  requestedInvites: any[] = [];
  showRequestsTable = false;
  modules: any[] = []; 
  moduleName: string = ''; 
  attendanceSubscription!: Subscription; 
  requestedInvitesSubscription!: Subscription; 
  studentsInModule: any;
  selectedModule: Module | null = null; 
  currentLecturerEmail: string | null = null;
  // expandedGroups: { [key: string]: boolean } = {};
expandedModuleGroups: { [key: string]: boolean } = {};
// students: AttendedStudent[] = [];
groupedByDate: GroupedByDate[] = [];
expandedDateGroups: { [key: string]: boolean } = {};
// expandedModuleGroups: { [key: string]: boolean } = {};
// showTable = true;


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
        this.groupedStudents = []; // Add this line
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
          const data = attendedDoc.data() as { details: any[] };
          console.log('Attendance data for module code:', moduleCode, data);

          if (data && data.details) {
            data.details.forEach(detail => {
              attendedData.push({
                email: detail.email,
                module: detail.module,
                scanDate: detail.scanDate,
                name: detail.name,
                surname: detail.surname,
                studentNumber: detail.studentNumber,
                count: detail.count
              });
            });
          }
        } else {
          console.log(`No attendance data found for module ${moduleCode}.`);
        }
      }

      this.students = attendedData;
      this.groupByDateAndModule(this.students);
      console.log('Grouped students data:', this.groupedByDate);
    } catch (error) {
      console.error('Error fetching attended students data:', error);
      this.students = [];
      this.groupedByDate = [];
    }
  }

  groupByDateAndModule(students: AttendedStudent[]) {
    const groupedData: { [key: string]: GroupedByDate } = {};

    students.forEach(student => {
      if (!groupedData[student.scanDate]) {
        groupedData[student.scanDate] = { date: student.scanDate, modules: [] };
      }

      let moduleGroup = groupedData[student.scanDate].modules.find(m => m.moduleCode === student.module);
      if (!moduleGroup) {
        moduleGroup = { moduleCode: student.module, students: [] };
        groupedData[student.scanDate].modules.push(moduleGroup);
      }

      moduleGroup.students.push({
        email: student.email,
        name: student.name,
        surname: student.surname,
        studentNumber: student.studentNumber,
        count: student.count
      });
    });

    this.groupedByDate = Object.values(groupedData).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    this.groupedByDate.forEach(dateGroup => {
      dateGroup.modules.sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));
      dateGroup.modules.forEach(moduleGroup => {
        moduleGroup.students.sort((a, b) => a.email.localeCompare(b.email));
      });
    });
  }

  // toggleTable() {
  //   this.showTable = !this.showTable;
  // }

  toggleDateGroup(date: string) {
    this.expandedDateGroups[date] = !this.expandedDateGroups[date];
    // When collapsing a date group, collapse all its module groups
    if (!this.expandedDateGroups[date]) {
      this.groupedByDate.find(group => group.date === date)?.modules.forEach(module => {
        this.expandedModuleGroups[`${date}-${module.moduleCode}`] = false;
      });
    }
  }

  isDateGroupExpanded(date: string): boolean {
    return this.expandedDateGroups[date] || false;
  }

  toggleModuleGroup(date: string, moduleCode: string) {
    const key = `${date}-${moduleCode}`;
    this.expandedModuleGroups[key] = !this.expandedModuleGroups[key];
  }

  isModuleGroupExpanded(date: string, moduleCode: string): boolean {
    const key = `${date}-${moduleCode}`;
    return this.expandedModuleGroups[key] || false;
  }
    
  
  async fetchPendingRequests(moduleCode: string, moduleName: string) {
    if (!moduleCode || !moduleName) {
      console.warn('Module code or module name is missing.');
      return;
    }
  
    try {
      console.log(`Fetching pending requests for module: ${moduleCode}, module name: ${moduleName}`);
  
      const correctModuleName = this.moduleName || moduleName;
  
      const requestsSnapshot = await this.firestore.collection('allModules')
        .doc(moduleCode)
        .collection(correctModuleName, ref => ref.where('status', '==', 'pending'))
        .get()
        .toPromise();
  
      if (requestsSnapshot && !requestsSnapshot.empty) {
        const batch = this.firestore.firestore.batch();
  
        for (const doc of requestsSnapshot.docs) {
          const data = doc.data();
          const studentNumber = data['studentNumber'];
          const studentEmail = data['email'];
          const studentName = data['name'];
          const studentSurname = data['surname'];
          const id = doc.id;
  
          this.requestedInvites.push({ id, ...data });
  
          // Reference to the student's document in enrolledModules
          const studentRef = this.firestore.collection('enrolledModules').doc(studentEmail).ref;
  
          // Update enrolledModules collection
          batch.set(studentRef, {
            email: studentEmail,
            name: studentName,
            surname: studentSurname,
            studentNumber: studentNumber,
            moduleCode: firebase.firestore.FieldValue.arrayUnion(moduleCode)
          }, { merge: true });
        }
  
        // Commit the batch
        await batch.commit();
  
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
  toggleTable() {
    this.showTable = !this.showTable;
  }

  toggleRequestsTable() {
    this.showRequestsTable = !this.showRequestsTable;
  }

  async updateStudentStatus(request: any, status: string) {
    console.log('Module Name:', this.moduleName);
    console.log('Module Code:', request.moduleCode);
    console.log('Student Number:', request.studentNumber);
  
    if (!this.moduleName || !request.moduleCode || !request.studentNumber) {
      console.warn('Module name, module code, or student number is missing.');
      await this.presentToast('Error updating student status. Required information is missing.', 'danger');
      return;
    }
  
    try {
      const documentPath = `allModules/${request.moduleCode}/${this.moduleName}/${request.studentNumber}`;
      console.log('Updating document at path:', documentPath);
  
      const docRef = this.firestore.collection('allModules')
        .doc(request.moduleCode)
        .collection(this.moduleName) 
        .doc(request.studentNumber);
  
      // Check if the document exists
      const docSnapshot = await docRef.get().toPromise();
  
      if (docSnapshot && docSnapshot.exists) {
        // Document exists, update it
        await docRef.update({ status });
      } else {
        // Document doesn't exist, create it
        await docRef.set({
          ...request,
          status: status
        });
      }
  
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

  approveStudent(request: any) {
    this.updateStudentStatus(request, 'active');
  }

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

