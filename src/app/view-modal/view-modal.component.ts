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

interface Department {
  name: string;
  modules?: Module[];  // Add this line to handle direct modules
  streams?: {
    [key: string]: {
      name: string;
      modules: Module[];
    };
  };
}

interface FacultyData {
  departments: Department[];
  id?: string;
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
      if (!this.currentStudent?.department) {
        console.log('No department specified for the student.');
        this.presentToast('Student department not found.', 'warning');
        return;
      }
  
      const facultyQuerySnapshot = await this.firestore
        .collection('faculties')
        .get()
        .toPromise();
  
      if (!facultyQuerySnapshot) {
        console.log('No faculty data found.');
        this.presentToast('No faculty data found.', 'warning');
        return;
      }
  
      let modulesArray: Module[] = [];
  
      facultyQuerySnapshot.forEach((doc) => {
        console.log('Processing faculty document:', doc.id);
        const facultyData = doc.data() as FacultyData;
        console.log('Faculty data:', facultyData);
        
        if (facultyData?.departments) {
          console.log('Found departments:', facultyData.departments);
          
          const matchingDepartment = facultyData.departments.find(
            (dept: { name: string }) => {
              console.log('Comparing department:', dept.name, 'with:', this.currentStudent?.department);
              return dept.name === this.currentStudent?.department;
            }
          );
  
          console.log('Matching department found:', matchingDepartment);
  
          if (matchingDepartment) {
            // Handle direct modules array if it exists
            if (matchingDepartment.modules && Array.isArray(matchingDepartment.modules)) {
              console.log('Found direct modules:', matchingDepartment.modules);
              modulesArray = [...modulesArray, ...matchingDepartment.modules];
            }
            
            // Also check for modules in streams if they exist
            if (matchingDepartment.streams) {
              console.log('Found streams:', matchingDepartment.streams);
              Object.keys(matchingDepartment.streams).forEach((streamKey) => {
                console.log('Processing stream:', streamKey);
                const stream = matchingDepartment.streams?.[streamKey];
                console.log('Stream data:', stream);
                
                if (stream?.modules && Array.isArray(stream.modules)) {
                  console.log('Found modules in stream:', stream.modules);
                  modulesArray = [...modulesArray, ...stream.modules];
                }
              });
            }
          }
        }
      });
  
      console.log('Final modules array:', modulesArray);
  
      if (modulesArray.length === 0) {
        console.log('No modules found in the streams.');
        this.presentToast('No modules found for this department.', 'warning');
        return;
      }
  
      this.availableModules = modulesArray;
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
    // Use optional chaining to safely access `studentNumber`
    if (!this.currentStudent?.studentNumber) {
      this.presentToast('Student information not available.', 'danger');
      return;
    }
  
    // Check if the module is already requested
    if (this.requestedModules.has(module.moduleCode)) {
      this.presentToast(`You have already requested to join ${module.moduleCode}`, 'warning');
      return;
    }
  
    try {
      // Get reference to the module document in 'enrolledModules' collection
      const enrolledModulesRef = firebase.firestore().collection('enrolledModules').doc(module.moduleCode);
      const enrolledDoc = await enrolledModulesRef.get();
      const currentEnrolled = enrolledDoc.exists ? (enrolledDoc.data()?.['Enrolled'] || []) : [];
  
      // Check if the student is already enrolled
      const isAlreadyEnrolled = currentEnrolled.some((enrolled: any) => 
        enrolled.studentNumber === this.currentStudent!.studentNumber
      );
      
      if (isAlreadyEnrolled) {
        this.presentToast(`You are already enrolled in ${module.moduleCode}.`, 'warning');
        return;
      }
  
      const batch = firebase.firestore().batch();
  
      // If the module document doesn't exist, initialize it with an empty Enrolled array
      if (!enrolledDoc.exists) {
        batch.set(enrolledModulesRef, {
          moduleCode: module.moduleCode,
          Enrolled: []
        });
      }
  
      // Prepare the enrollment request
      const enrollmentRequest = {
        status: "pending",
        studentNumber: this.currentStudent!.studentNumber
      };
  
      // Add the request to the Enrolled array
      batch.update(enrolledModulesRef, {
        Enrolled: firebase.firestore.FieldValue.arrayUnion(enrollmentRequest)
      });
  
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
