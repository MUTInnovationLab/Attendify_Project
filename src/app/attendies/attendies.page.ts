import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import 'firebase/compat/firestore';
import firebase from 'firebase/compat/app';
import { NotificationService } from '../services/notification.service'; 

import { PopoverController } from '@ionic/angular';
import { NotificationPopoverComponent } from '../notification-popover/notification-popover.component';


interface Module {
  id: string;
  moduleCode: string;
  moduleLevel: string;
  moduleName: string;
  userEmail: string;
  place?: string;
  selected?: boolean;
  scannerOpenCount: number;
  
}

// interface AttendanceData {
//   [key: string]: string[]; // scanDate as key and array of emails as value
// }

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

// interface Student {
//   email: string;
//   name: string;
//   studentNumber: string;
//   surname: string;
// }

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

interface LecturerData {
  staffNumber: string;
  email: string;
  // Add other properties as needed
}

interface ModuleData {
  moduleCode: string;
  moduleLevel: string;
  department: string;
  scannerOpenCount: number;
}

interface AssignedLectures {
  modules: ModuleData[]; // Assuming modules is an array of ModuleData
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
currentPage: number = 1;
pageSize: number = 7;
totalPages: number = 1;
  preventPopover = false; // Add this flag

  constructor(
    private firestore: AngularFirestore,
    private toastController: ToastController,
    private afAuth: AngularFireAuth,
    private notificationService: NotificationService,
    private popoverController: PopoverController 
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
          await this.fetchPendingRequests(module.moduleCode);
        }
      }
    } catch (error) {
      console.error('Error fetching lecturer details:', error);
    }
  }
  
// Fetch modules for lecturer
async fetchModulesForLecturer() {
  try {
    // Step 1: Fetch lecturer details using email
    const lecturerDoc = await this.firestore.collection<LecturerData>('staff', ref =>
      ref.where('email', '==', this.currentLecturerEmail)
    ).get().toPromise();

    if (lecturerDoc && !lecturerDoc.empty) {
      const lecturerData = lecturerDoc.docs[0].data();
      const staffNumber = lecturerData.staffNumber; // Get staffNumber from lecturer data
      console.log('Lecturer data:', lecturerData);
      console.log('Staff Number:', staffNumber);

      // Step 2: Fetch modules assigned to the lecturer using staffNumber as the document ID
      const lecturerModulesDoc = await this.firestore.collection('assignedLectures').doc(staffNumber).get().toPromise();

      // Check if lecturerModulesDoc is defined and exists
      if (lecturerModulesDoc && lecturerModulesDoc.exists) {
        const lecturerDetails = lecturerModulesDoc.data() as AssignedLectures; // Cast to AssignedLectures
        console.log('Lecturer Modules:', lecturerDetails);

        // Check if modules exist and iterate over them
        if (lecturerDetails && lecturerDetails.modules) {
          // Clear existing modules before fetching new ones
          this.modules = [];
          lecturerDetails.modules.forEach((module: ModuleData) => {
            // Add each module to the modules array
            this.modules.push({
              moduleCode: module.moduleCode,
              moduleLevel: module.moduleLevel,
              scannerOpenCount: module.scannerOpenCount,
              id: '',
              moduleName: '',
              userEmail: ''
            });
            console.log('Added Module:', module.moduleCode);
          });
        } else {
          console.log('No modules found for the lecturer.');
        }
      } else {
        console.log('No assigned lectures found for the lecturer with staffNumber:', staffNumber);
      }
    } else {
      console.log('Lecturer details not found.');
    }
  } catch (error) {
    console.error('Error fetching modules for lecturer:', error);
  }
}


// Fetch attended students
async fetchAttendedStudents() {
  try {
    // Check if modules exist
    if (this.modules.length === 0) {
      console.log('No modules found for the lecturer.');
      return;
    }

    const records: AttendanceRecord[] = [];

    // Iterate through each module to fetch attendance
    for (const module of this.modules) {
      const attendedDoc = await this.firestore.collection('Attended').doc(module.moduleCode).get().toPromise();

      // Check if the document exists and handle the possibility of undefined
      if (attendedDoc && attendedDoc.exists) {
        const data = attendedDoc.data() as { [key: string]: any };

        // Iterate over dates and map attendance data
        Object.keys(data).forEach(date => {
          const attendances = data[date];
          records.push({
            date,
            module: { moduleCode: module.moduleCode },
            attendances: attendances.map((a: any) => ({
              scanTime: a.scanTime,
              studentNumber: a.studentNumber
            }))
          });
        });
      } else {
        console.log(`No attendance records found for module: ${module.moduleCode}`);
      }
    }

    // Sort attendance records by date
    this.attendanceRecords = records.sort((a, b) => b.date.localeCompare(a.date));
    this.dates = [...new Set(records.map(r => r.date))].sort((a, b) => b.localeCompare(a));

    console.log('Attendance records:', this.attendanceRecords);
    console.log('Dates:', this.dates);
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

  getPaginatedRecords(): GroupedAttendanceRecord[] {
    const groupedRecords = this.getGroupedRecords();
    this.totalPages = Math.max(1, Math.ceil(groupedRecords.length / this.pageSize));
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return groupedRecords.slice(startIndex, endIndex);
  }

  changePage(newPage: number) {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
    }
  }

  



  async fetchPendingRequests(moduleCode: string) {
    if (!moduleCode) {
        console.warn('Module code is missing.');
        return;
    }

    try {
        console.log(`Fetching pending requests for module: ${moduleCode}`);

        // Fetch the document for the specific module code
        const enrolledModulesSnapshot = await this.firestore
            .collection('enrolledModules')
            .doc(moduleCode)
            .get()
            .toPromise();

        // Check if the document exists and is not undefined
        if (enrolledModulesSnapshot?.exists) {
            const enrolledData = enrolledModulesSnapshot.data() as { Enrolled?: any[] };

            // Filter the 'Enrolled' array for students with status 'pending'
            const pendingRequests = enrolledData.Enrolled?.filter(student => student.status === 'pending') || [];

            console.log('Pending Requests:', pendingRequests); // Log pending requests

            const newRequests = pendingRequests.map(student => ({
                id: student.studentNumber,
                studentNumber: student.studentNumber,
                status: student.status,
                moduleCode: moduleCode,
            }));

            // Update the requestedInvites array with the new requests
            this.requestedInvites = [...this.requestedInvites, ...newRequests];

            console.log('Updated pending requests data:', this.requestedInvites); // Log final invites
        } else {
            console.log(`No enrolled students found for module ${moduleCode}.`);
        }
    } catch (error) {
        console.error('Error fetching pending requests data:', error);
    }

    // Set showRequestsTable to true after fetching
    this.showRequestsTable = true;
}

  toggleTable() {
    this.showTable = !this.showTable;
  }

  toggleRequestsTable() {
    this.showRequestsTable = !this.showRequestsTable;
  }

  async updateStudentStatus(request: any, action: 'Enroll' | 'remove') {
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

        if (action === 'Enroll') {
          // Find and update the student's status
          const studentIndex = enrolledArray.findIndex(student => student.studentNumber === request.studentNumber);
          if (studentIndex !== -1) {
            enrolledArray[studentIndex].status = 'Enrolled';
            await enrolledModulesRef.update({ Enrolled: enrolledArray });
            await this.presentToast('Student enrolled successfully.', 'success');
            this.notificationService.addNotification(`You have been enrolled in the ${request.moduleCode} module.`);
          } else {
            await this.presentToast('Student not found in the module.', 'danger');
          }
        } else if (action === 'remove') {
          // Remove the student from the array
          enrolledArray = enrolledArray.filter(student => student.studentNumber !== request.studentNumber);
          await enrolledModulesRef.update({ Enrolled: enrolledArray });
          await this.presentToast('Student removed successfully.', 'success');
          this.notificationService.addNotification(`You have been removed from the ${request.moduleCode} module.`);
        }

        // Refresh the pending requests
        await this.fetchPendingRequests(request.moduleCode);
      } else {
        await this.presentToast('Module not found.', 'danger');
      }
    } catch (error) {
      console.error('Error updating student status:', error);
      await this.presentToast('Error updating student status. Please try again.', 'danger');
    }
  }

  approveStudent(request: any) {
    this.preventPopover = true;
    console.log('Approving student:', request);
    this.updateStudentStatus(request, 'Enroll');
    //this.preventPopover = false;
  }
  
  declineStudent(request: any) {
    this.preventPopover = true;
    console.log('Declining student:', request);
    this.updateStudentStatus(request, 'remove');
    //this.preventPopover = false;
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
