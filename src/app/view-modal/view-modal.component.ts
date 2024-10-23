import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ToastController } from '@ionic/angular';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// interface Module {
//   moduleCode: string;
//   moduleLevel: string;
//   department: string;
//   staffNumber?: string;  // Add staffNumber to the Module interface
// }

interface Student {
  email: string;
  name: string;
  surname: string;
  studentNumber: string;
  moduleCode: string;
  status: string;
}

// Define types for your module and assignedLectures
interface Module {
  department: string;
  moduleCode: string;
  moduleLevel: string;
  scannerOpenCount: number;
  staffNumber?: string; 
}

interface AssignedLectures {
  modules: Module[];
}

export interface Lecturer {
  id?: string;
  fullName: string;
  email: string;
  position: string;
  staffNumber: string;
  department: string;
}

@Component({
  selector: 'app-view-modal',
  templateUrl: './view-modal.component.html',
  styleUrls: ['./view-modal.component.scss'],
})
export class ViewModalComponent implements OnInit {
  // availableModules: Module[] = [];
  // filteredModules: Module[] = [];
  searchQuery: string = '';
  selectedModules: Module[] = [];
  currentStudent: Student | null = null;
  availableModules: any[] = [];
  filteredModules: any[] = [];

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
    console.log('Student information:', this.currentStudent);
    this.fetchAvailableModules();
  }

  async fetchAvailableModules() {
    console.log('Fetching available modules...');
    try {
      const modulesSnapshot = await this.firestore.collection('assignedLectures').ref.get();
      if (modulesSnapshot.empty) {
        console.log('No modules found.');
        this.presentToast('No modules available.', 'warning'); // Check this
        return;
      }

      this.availableModules = await Promise.all(
        modulesSnapshot.docs.map((doc) => {
          const data = doc.data() as AssignedLectures;
          if (!data || !data.modules) {
            console.error('Document data is missing modules:', doc.id, data);
            this.presentToast(`Document ${doc.id} has no modules`, 'warning'); // Check this
            return [];
          }
          const staffNumber = doc.id;
          return data.modules.map((module: Module) => ({
            ...module,
            staffNumber,
          }));
        })
      ).then((modules) => modules.flat());

      this.filteredModules = [...this.availableModules];
      console.log('Modules fetched:', this.availableModules);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error fetching modules:', error.message);
        this.presentToast('Failed to load modules. Please try again.', 'danger');
      } else {
        console.error('Unexpected error:', error);
        this.presentToast('An unexpected error occurred.', 'danger');
      }
    }
  }

  

  async fetchCurrentStudent() {
    console.log('Fetching current student information...');
    try {
      const user = await this.afAuth.currentUser;
      if (user) {
        console.log('User UID:', user.uid);
        const userEmail = user.email;

        if (userEmail) {
          const studentQuerySnapshot = await this.firestore
            .collection('students', ref => ref.where('email', '==', userEmail))
            .get()
            .toPromise();

          if (studentQuerySnapshot && !studentQuerySnapshot.empty) {
            const studentDoc = studentQuerySnapshot.docs[0];
            const data = studentDoc.data() as Student;
            this.currentStudent = data;
            console.log('Student information fetched successfully:', this.currentStudent);
          } else {
            console.log('Student document does not exist or is empty.');
            this.currentStudent = null;
            this.presentToast('Student information not found.', 'warning');
          }
        } else {
          console.log('User email not found.');
          this.currentStudent = null;
          this.presentToast('User email not found.', 'warning');
        }
      } else {
        console.log('No user is currently logged in.');
        this.currentStudent = null;
        this.presentToast('No user logged in.', 'warning');
      }
    } catch (error) {
      console.error('Error fetching current student:', error);
      this.currentStudent = null;
      this.presentToast('Failed to fetch student information.', 'danger');
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

    try {
      const batch = firebase.firestore().batch();

      // References to both collections
      const enrolledModulesRef = firebase.firestore().collection('enrolledModules').doc(module.moduleCode);
      const moduleStudentsRef = enrolledModulesRef.collection('students');

      // Update the enrolledModules collection with "pending" status
      batch.set(enrolledModulesRef, {
        Enrolled: firebase.firestore.FieldValue.arrayUnion({
          status: "pending",
          studentNumber: this.currentStudent.studentNumber
        })
      }, { merge: true });

      // Add the student to the module in the students collection with "pending" status
      const studentDocRef = moduleStudentsRef.doc(this.currentStudent.studentNumber);
      batch.set(studentDocRef, {
        email: this.currentStudent.email,
        name: this.currentStudent.name,
        surname: this.currentStudent.surname,
        studentNumber: this.currentStudent.studentNumber,
        moduleCode: module.moduleCode,
        status: "pending"  // Pending status until confirmed
      });

      // Commit the batch operation
      await batch.commit();

      this.presentToast(`Successfully requested to join ${module.moduleCode}. Pending approval.`, 'success');
    } catch (error) {
      console.error('Error requesting to join module:', error);
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

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color,
    });

    await toast.present();
  }

  dismiss() {
    this.modalController.dismiss().catch(err => {
      console.error('Error dismissing modal:', err);
    });
  }
}
