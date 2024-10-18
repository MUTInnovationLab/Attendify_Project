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
    if (!moduleCode) {
      console.warn('Module code is missing.');
      return;
    }
  
    try {
      console.log(`Fetching pending requests for module: ${moduleCode}`);
  
      const enrolledModulesSnapshot = await this.firestore.collection('enrolledModules').doc(moduleCode).get().toPromise();
  
      if (enrolledModulesSnapshot && enrolledModulesSnapshot.exists) {
        const enrolledData = enrolledModulesSnapshot.data() as { Enrolled?: any[] };
        const pendingRequests = enrolledData.Enrolled?.filter(student => student.status === 'pending') || [];
  
        const newRequests = pendingRequests.map(student => ({
          id: student.studentNumber,
          studentNumber: student.studentNumber,
          status: student.status,
          moduleCode: moduleCode,
          email: student.email || '',
          name: student.name || '',
          surname: student.surname || ''
        }));
  
        // Concatenate new requests with existing ones
        this.requestedInvites = [...this.requestedInvites, ...newRequests];
  
        console.log('Updated pending requests data:', this.requestedInvites);
      } else {
        console.log(`No enrolled students found for module ${moduleCode}.`);
      }
  
    } catch (error) {
      console.error('Error fetching pending requests data:', error);
    }
  
    // Always set showRequestsTable to true after fetching, even if there are no pending requests
    this.showRequestsTable = true;
  }
  toggleTable() {
    this.showTable = !this.showTable;
  }

  toggleRequestsTable() {
    this.showRequestsTable = !this.showRequestsTable;
  }

  async updateStudentStatus(request: any, action: 'enroll' | 'remove') {
    console.log('--- Start of updateStudentStatus ---');

    if (!request.moduleCode || !request.studentNumber) {
      await this.presentToast('Error updating student status. Required information is missing.', 'danger');
      console.error('Missing required fields: moduleCode or studentNumber.');
      return;
    }

    try {
      const enrolledModulesRef = this.firestore.collection('enrolledModules').doc(request.moduleCode);

      // Get the current Enrolled array
      const doc = await enrolledModulesRef.get().toPromise();
      if (doc && doc.exists) {
        const data = doc.data() as { Enrolled?: any[] };
        let enrolledArray = data.Enrolled || [];

        if (action === 'enroll') {
          // Find and update the student's status
          const studentIndex = enrolledArray.findIndex(student => student.studentNumber === request.studentNumber);
          if (studentIndex !== -1) {
            enrolledArray[studentIndex].status = 'enrolled';
            await enrolledModulesRef.update({ Enrolled: enrolledArray });
            await this.presentToast('Student enrolled successfully.', 'success');
          } else {
            await this.presentToast('Student not found in the module.', 'danger');
          }
        } else if (action === 'remove') {
          // Remove the student from the array
          enrolledArray = enrolledArray.filter(student => student.studentNumber !== request.studentNumber);
          await enrolledModulesRef.update({ Enrolled: enrolledArray });
          await this.presentToast('Student removed successfully.', 'success');
        }

        // Refresh the pending requests
        await this.fetchPendingRequests(request.moduleCode, '');
      } else {
        await this.presentToast('Module not found.', 'danger');
      }
    } catch (error) {
      console.error('Error updating student status:', error);
      await this.presentToast('Error updating student status. Please try again.', 'danger');
    }
  }

  approveStudent(request: any) {
    console.log('Approving student:', request);
    this.updateStudentStatus(request, 'enroll');
  }
  
  declineStudent(request: any) {
    console.log('Declining student:', request);
    this.updateStudentStatus(request, 'remove');
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
