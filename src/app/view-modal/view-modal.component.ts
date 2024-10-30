import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ToastController } from '@ionic/angular';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

interface Student {
  email: string;
  name: string;
  surname: string;
  studentNumber: string;
  department: string;
}

interface Module {
  moduleCode: string;
  moduleLevel: string;
  moduleName: string;
  staffNumber: string;
}

interface FacultyData {
  departments: {
    name: string;
    streams: {
      modules: Module[];
    }[];
  }[];
}

interface EnrolledData {
  status: string;
  studentNumber: string;
}

interface EnrolledModule {
  Enrolled: EnrolledData[];
}

@Component({
  selector: 'app-view-modal',
  templateUrl: './view-modal.component.html',
  styleUrls: ['./view-modal.component.scss'],
})
export class ViewModalComponent implements OnInit {
  searchQuery: string = '';
  selectedModules: Module[] = [];
  currentStudent: Student | null = null;
  availableModules: Module[] = [];
  filteredModules: Module[] = [];
  requestedModules: Set<string> = new Set(); // Property to track requested modules

  constructor(
    private modalController: ModalController,
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.initialize();
  }

  async initialize() {
    console.log('Initializing component...');
    await this.fetchCurrentStudent();
    if (this.currentStudent) {
      await this.fetchAvailableModules();
      await this.fetchRequestedModules(); // Fetch already requested modules
    }
  }

  // Fetch already requested modules
  async fetchRequestedModules() {
    if (!this.currentStudent) return;

    try {
      const modulesSnapshot = await this.firestore
        .collection('enrolledModules')
        .get()
        .toPromise();

      if (modulesSnapshot) {
        modulesSnapshot.forEach(doc => {
          const data = doc.data() as EnrolledModule; // Cast data to EnrolledModule type
          if (data.Enrolled && Array.isArray(data.Enrolled)) {
            const isRequested = data.Enrolled.some((enrollment: EnrolledData) => // Cast to EnrolledData
              enrollment.studentNumber === this.currentStudent?.studentNumber &&
              (enrollment.status === 'pending' || enrollment.status === 'approved')
            );
            if (isRequested) {
              this.requestedModules.add(doc.id);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error fetching requested modules:', error);
    }
  }

  async fetchCurrentStudent() {
    console.log('Fetching current student information...');
    try {
      const user = await this.afAuth.currentUser;
      if (user) {
        const userEmail = user.email;
        if (userEmail) {
          const studentQuerySnapshot = await this.firestore
            .collection('students', ref => ref.where('email', '==', userEmail))
            .get()
            .toPromise();

          if (studentQuerySnapshot && !studentQuerySnapshot.empty) {
            const studentDoc = studentQuerySnapshot.docs[0];
            this.currentStudent = studentDoc.data() as Student;
            console.log('Student information:', this.currentStudent);
          } else {
            this.presentToast('Student information not found.', 'warning');
          }
        }
      } else {
        this.presentToast('No user logged in.', 'warning');
      }
    } catch (error) {
      console.error('Error fetching student:', error);
      this.presentToast('Failed to fetch student information.', 'danger');
    }
  }


  async fetchAvailableModules() {
    console.log('Fetching available modules for department:', this.currentStudent?.department);
    try {
      if (!this.currentStudent || !this.currentStudent.department) {
        console.log('No department specified for the student.');
        this.presentToast('Student department not found.', 'warning');
        return;
      }

      const facultyQuerySnapshot = await this.firestore
        .collection('faculties')
        .get()
        .toPromise();

      if (!facultyQuerySnapshot || facultyQuerySnapshot.empty) {
        console.log('No faculties found.');
        this.presentToast('No faculties found.', 'warning');
        return;
      }

      let departmentData: any = null;

      facultyQuerySnapshot.forEach(doc => {
        const facultyData = doc.data() as FacultyData;
        if (facultyData.departments) {
          const matchingDepartment = facultyData.departments.find(
            (dept: any) => dept.name === this.currentStudent?.department
          );

          if (matchingDepartment) {
            departmentData = matchingDepartment;
            return;
          }
        }
      });

      if (!departmentData) {
        console.log(`Department ${this.currentStudent?.department} not found in any faculty.`);
        this.presentToast('No modules found for this department.', 'warning');
        return;
      }

      if (departmentData.streams && typeof departmentData.streams === 'object') {
        const modulesArray: Module[] = [];

        Object.keys(departmentData.streams).forEach((streamKey: string) => {
          const stream = departmentData.streams[streamKey];

          if (Array.isArray(stream)) {
            stream.forEach((streamObj: any) => {
              if (Array.isArray(streamObj.modules)) {
                modulesArray.push(...streamObj.modules);
              } else {
                console.log(`Stream ${streamKey} does not contain a valid modules array.`);
              }
            });
          } else {
            console.log(`Stream ${streamKey} is not an array.`);
          }
        });

        this.availableModules = modulesArray;
      } else {
        console.log('Streams data is not an object or is undefined.');
        this.presentToast('No modules found for this department.', 'warning');
        return;
      }

      this.filteredModules = [...this.availableModules];
      console.log('Modules fetched for department:', this.availableModules);
    } catch (error) {
      console.error('Error fetching modules:', error);
      this.presentToast('Failed to load modules. Please try again.', 'danger');
    }
  }

  filterModules() {
    if (this.searchQuery.trim() === '') {
      this.filteredModules = [...this.availableModules];
    } else {
      this.filteredModules = this.availableModules.filter(module =>
        module.moduleCode.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
  }

  toggleModuleSelection(module: Module) {
    // Check if module is already requested
    if (this.requestedModules.has(module.moduleCode)) {
      this.presentToast(`You have already requested to join ${module.moduleCode}`, 'warning');
      return;
    }

    const index = this.selectedModules.findIndex(m => m.moduleCode === module.moduleCode);
    if (index > -1) {
      this.selectedModules.splice(index, 1);
    } else {
      this.selectedModules.push(module);
    }
  }

  isModuleSelected(module: Module): boolean {
    return this.selectedModules.some(m => m.moduleCode === module.moduleCode);
  }

  // Check if module is already requested
  isModuleRequested(module: Module): boolean {
    return this.requestedModules.has(module.moduleCode);
  }

  cancelSelection(module: Module) {
    const index = this.selectedModules.findIndex(m => m.moduleCode === module.moduleCode);
    if (index > -1) {
      this.selectedModules.splice(index, 1);
    }
  }



  async addStudentToModule(module: Module) {
    if (!this.currentStudent) {
      this.presentToast('Student information not available.', 'danger');
      return;
    }
  
    // Check if module is already requested
    if (this.requestedModules.has(module.moduleCode)) {
      this.presentToast(`You have already requested to join ${module.moduleCode}`, 'warning');
      return;
    }
  
    try {
      const batch = firebase.firestore().batch();
  
      const enrolledModulesRef = firebase.firestore().collection('enrolledModules').doc(module.moduleCode);
  
      // Ensure that we are updating the Enrolled array without creating a subcollection
      batch.set(enrolledModulesRef, {
        Enrolled: firebase.firestore.FieldValue.arrayUnion({
          status: "pending", // Keep status as "pending" when requesting
          studentNumber: this.currentStudent.studentNumber
        })
      }, { merge: true });
  
      await batch.commit();
      
      // Add the module to requested modules set
      this.requestedModules.add(module.moduleCode);
      
      this.presentToast(`Requested to join ${module.moduleCode}. Pending approval.`, 'success');
    } catch (error) {
      console.error('Error requesting module:', error);
      this.presentToast(`Failed to request joining ${module.moduleCode}.`, 'danger');
    }
  }
  

  

  async submitSelection() {
    if (this.selectedModules.length === 0) {
      this.presentToast('Please select at least one module.', 'warning');
      return;
    }

    for (const module of this.selectedModules) {
      await this.addStudentToModule(module);
    }
    this.dismiss();
  }

  dismiss() {
    this.modalController.dismiss();
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
    });
    await toast.present();
  }
}
