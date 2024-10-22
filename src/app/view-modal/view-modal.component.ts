import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ToastController } from '@ionic/angular';
//import * as firebase from 'firebase/compat';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

interface Module {
  id: string;
  moduleCode: string;
  moduleLevel: string;
  moduleName: string;
  userEmail: string;
  place?: string;
  selected?: boolean;
}

interface Student {
  email: string;
  name: string;
  surname: string;
  studentNumber: string;
  moduleCode: string;
  moduleName: string;
  status: string;
}

// Define interfaces for your data
export interface Lecturer {
  id?: string; // Firestore document ID
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
  availableModules: Module[] = [];
  filteredModules: Module[] = [];
  searchQuery: string = '';
  selectedModules: Module[] = [];
  currentStudent: Student | null = null;

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
        this.presentToast('No modules available.', 'warning');
        return;
      }
      
      this.availableModules = modulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Module, 'id'>),
        selected: false
      }));
      this.filteredModules = [...this.availableModules];
      console.log('Modules fetched:', this.availableModules);
    } catch (error) {
      console.error('Error fetching modules:', error);
      this.presentToast('Failed to load modules. Please try again.', 'danger');
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
            .collection('registeredStudents', ref => ref.where('email', '==', userEmail))
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
        module.moduleName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        module.moduleCode.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
  }

  toggleModuleSelection(module: Module) {
    const index = this.selectedModules.findIndex(m => m.id === module.id);
    if (index > -1) {
      this.selectedModules.splice(index, 1);
    } else {
      this.selectedModules.push(module);
    }
  }

  isModuleSelected(module: Module): boolean {
    return this.selectedModules.some(m => m.id === module.id);
  }

  cancelSelection(module: Module) {
    const index = this.selectedModules.findIndex(m => m.id === module.id);
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
    const allModulesRef = firebase.firestore().collection('allModules').doc(module.moduleCode);
    const moduleStudentsRef = allModulesRef.collection(module.moduleName);
    
    // Update the enrolledModules collection with "pending" status
    batch.set(enrolledModulesRef, {
      Enrolled: firebase.firestore.FieldValue.arrayUnion({
        status: "pending",
        studentNumber: this.currentStudent.studentNumber
      })
    }, { merge: true });
    
    // Add the student to the module in the allModules collection with "pending" status
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
    
    this.presentToast(`Successfully requested to join ${module.moduleName}. Pending approval.`, 'success');
  } catch (error) {
    console.error('Error requesting to join module:', error);
    this.presentToast(`Failed to request joining ${module.moduleName}.`, 'danger');
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
