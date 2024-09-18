import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ToastController } from '@ionic/angular';

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
      const modulesSnapshot = await this.firestore.collection('modules').ref.get();
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
      const moduleRef = this.firestore.collection('allModules').doc(module.moduleCode);
      const studentsRef = moduleRef.collection(module.moduleName);
  
      await studentsRef.doc(this.currentStudent.studentNumber).set({
        email: this.currentStudent.email,
        name: this.currentStudent.name,
        surname: this.currentStudent.surname,
        studentNumber: this.currentStudent.studentNumber,
        moduleCode: module.moduleCode,
        status: 'pending'
      });
  
      this.presentToast(`Successfully requested to join ${module.moduleName}. Pending approval.`, 'success');
    } catch (error) {
      console.error('Error adding student to module:', error);
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
