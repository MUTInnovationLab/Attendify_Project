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

interface GroupedAttendanceRecord {
  date: string;
  moduleCode: string;
  attendances: {
    scanTime: string;
    studentNumber: string;
  }[];
}

interface AttendanceRecord {
  date: string;
  module: {
    moduleCode: string;
  };
  attendances: {
    scanTime: string;
    studentNumber: string;
  }[];
}

interface ModuleData {
  enrolledStudents?: string[];
  attendedStudents?: string[];
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
  // modules: any[] = []; 
  module: any[] = []; 
  moduleName: string = ''; 
  attendanceSubscription!: Subscription; 
  requestedInvitesSubscription!: Subscription; 
  studentsInModule: any;
  selectedModule: Module | null = null; 
  currentLecturerEmail: string | null = null;
expandedModuleGroups: { [key: string]: boolean } = {};
groupedByDate: GroupedByDate[] = [];
expandedDateGroups: { [key: string]: boolean } = {};
attendanceRecords: AttendanceRecord[] = [];
  dates: string[] = [];
  modules: Module[] = []; // Change this to Module[]
  selectedDate: string | null = null;
  showStatistics: boolean = false;
attendedStudentsCount: number = 0;
nonAttendedStudentsCount: number = 0;
totalEnrolledStudents: number = 0;

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
      const attendedCollection = await this.firestore.collection('Attended').get().toPromise();
      if (attendedCollection) {
        const records: AttendanceRecord[] = [];
        const modulesSet = new Set<string>();

        attendedCollection.forEach(doc => {
          const moduleCode = doc.id;
          modulesSet.add(moduleCode);
          const data = doc.data() as { [key: string]: any };

          Object.keys(data).forEach(date => {
            const attendances = data[date];
            records.push({
              date,
              module: { moduleCode },
              attendances: attendances.map((a: any) => ({
                scanTime: a.scanTime,
                studentNumber: a.studentNumber
              }))
            });
          });
        });

        this.attendanceRecords = records.sort((a, b) => b.date.localeCompare(a.date));
        this.dates = [...new Set(records.map(r => r.date))].sort((a, b) => b.localeCompare(a));
        
        // Update this part to create proper Module objects
        this.modules = [...modulesSet].map(moduleCode => ({
          id: moduleCode,
          moduleCode,
          moduleLevel: '', 
          moduleName: '', 
          userEmail: this.currentLecturerEmail || ''
        })).sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));
        
        console.log('Attendance records:', this.attendanceRecords);
        console.log('Dates:', this.dates);
        console.log('Modules:', this.modules);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  }

  selectDate(date: string) {
    this.selectedDate = this.selectedDate === date ? null : date;
    this.selectedModule = null;
  }

  selectModule(module: Module) {
    this.selectedModule = this.selectedModule?.id === module.id ? null : module;
  }

  getFilteredRecords(): AttendanceRecord[] {
    return this.attendanceRecords.filter(record => 
      (!this.selectedDate || record.date === this.selectedDate) &&
      (!this.selectedModule || record.module.moduleCode === this.selectedModule.moduleCode)
    );
  }

  getGroupedRecords(): GroupedAttendanceRecord[] {
    const filteredRecords = this.getFilteredRecords();
    const groupedRecords: GroupedAttendanceRecord[] = [];

    filteredRecords.forEach(record => {
      const existingGroup = groupedRecords.find(
        group => group.date === record.date && group.moduleCode === record.module.moduleCode
      );

      if (existingGroup) {
        existingGroup.attendances.push(...record.attendances);
      } else {
        groupedRecords.push({
          date: record.date,
          moduleCode: record.module.moduleCode,
          attendances: [...record.attendances]
        });
      }
    });

    // Sort attendances within each group by scanTime
    groupedRecords.forEach(group => {
      group.attendances.sort((a, b) => a.scanTime.localeCompare(b.scanTime));
    });

    // Sort grouped records by date (descending) and then by moduleCode
    return groupedRecords.sort((a, b) => {
      const dateComparison = b.date.localeCompare(a.date);
      if (dateComparison !== 0) return dateComparison;
      return a.moduleCode.localeCompare(b.moduleCode);
    });
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
    console.log('--- Start of updateStudentStatus ---');

    // Ensure request has the required fields
    if (!request.moduleCode || !request.studentNumber || !request.email || !request.name || !request.surname) {
        await this.presentToast('Error updating student status. Required information is missing.', 'danger');
        console.error('Missing required fields: moduleCode, studentNumber, email, name, or surname.');
        return;
    }

    try {
        // Fetch the correct moduleName from the 'modules' collection using the moduleCode
        const moduleSnapshot = await this.firestore.collection('modules', ref =>
            ref.where('moduleCode', '==', request.moduleCode)
        ).get().toPromise();

        if (moduleSnapshot && !moduleSnapshot.empty) {
            const moduleData = moduleSnapshot.docs[0].data() as { moduleName: string };
            const correctModuleName = moduleData.moduleName;

            // Use the correct moduleName to update the allModules collection
            const allModulesRef = this.firestore.collection('allModules')
                .doc(request.moduleCode)
                .collection(correctModuleName)
                .doc(request.studentNumber).ref; // Get the DocumentReference using .ref

            const enrolledModulesRef = this.firestore.collection('enrolledModules')
                .doc(request.studentNumber).ref; // Get the DocumentReference for enrolledModules

            // Start a batch write
            const batch = this.firestore.firestore.batch();

            // Update the student's status in allModules
            batch.update(allModulesRef, { status: status });

            // Update or add the student's document in enrolledModules, with merge set to true to avoid overwriting
            batch.set(enrolledModulesRef, {
                email: request.email,
                moduleCode: firebase.firestore.FieldValue.arrayUnion(request.moduleCode), // Add moduleCode to array
                name: request.name,
                studentNumber: request.studentNumber,
                surname: request.surname
            }, { merge: true });

            // Commit the batch
            await batch.commit();

            await this.presentToast('Student status and enrolled module updated successfully.', 'success');
        } else {
            await this.presentToast('Error updating student status. Module not found.', 'danger');
            console.error(`Module not found for moduleCode: ${request.moduleCode}`);
        }

    } catch (error) {
        console.error('Error updating student status:', error);
        await this.presentToast('Error updating student status. Please try again.', 'danger');
    }
}

  
  // Method to approve a student's request, marking them active in allModules
  approveStudent(request: any) {
    console.log('Approving student:', request);
    this.updateStudentStatus(request, 'active');
  }
  
  // Method to decline a student's request, marking them as declined
  declineStudent(request: any) {
    console.log('Declining student:', request);
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
