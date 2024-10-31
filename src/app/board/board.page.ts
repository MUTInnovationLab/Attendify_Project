import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, LoadingController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FacultyService } from '../services/faculty.service';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { firstValueFrom } from 'rxjs';

interface Module {
  moduleName: string;
  moduleCode: string;
  moduleLevel: string;
  credits?: number;
  year?: number;
}

interface Stream {
  name: string;
  modules: Module[];
}

interface Department {
  name: string;
  modules?: Module[];
  streams?: { [key: string]: Stream[] };
}

interface Faculty {
  id: string;
  departments: Department[];
}

@Component({
  selector: 'app-board',
  templateUrl: './board.page.html',
  styleUrls: ['./board.page.scss'],
})
export class BoardPage implements OnInit {
  academiaForm!: FormGroup;
  faculties: Faculty[] = [];
  selectedFaculty: Faculty | null = null;
  selectedDepartment: Department | null = null;
  selectedStream: Stream | null = null;
  availableStreams: string[] = [];
  modules: Module[] = [];

  moduleName: string = '';
  moduleCode: string = '';
  moduleLevel: string = '';
  userData: any;
  department: any;
  loadingController: any;
  db: any;

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private facultyService: FacultyService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController // Correctly declared loadingCtrl
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.loadFaculties();
    this.setupFormListeners();
  }

  private initForm() {
    this.academiaForm = this.fb.group({
      faculty: ['', Validators.required],
      department: ['', Validators.required],
      stream: [''],
      selectedModule: [''],
      moduleDetails: this.fb.group({
        moduleName: ['', Validators.required],
        moduleCode: ['', Validators.required],
        moduleLevel: ['', Validators.required],
        credits: [null, [Validators.required, Validators.min(1)]],
        year: [null, Validators.required],
      }),
    });
  }

  async loadFaculties() {
    const loading = await this.loadingCtrl.create({
      message: 'Loading faculties...',
    });
    await loading.present();

    try {
      this.facultyService.getFaculties().subscribe(
        (faculties) => {
          this.faculties = faculties;
          loading.dismiss();
        },
        async (error) => {
          await this.showToast('Error loading faculties: ' + error.message, 'danger');
          loading.dismiss();
        }
      );
    } catch (error: any) {
      await this.showToast('Error loading faculties: ' + error.message, 'danger');
      loading.dismiss();
    }
  }

  private setupFormListeners() {
    this.academiaForm.get('faculty')?.valueChanges.subscribe(async (facultyId) => {
      if (facultyId) {
        const loading = await this.loadingCtrl.create({
          message: 'Loading faculty data...',
        });
        await loading.present();

        try {
          const facultyDoc = await this.firestore.collection('faculties').doc(facultyId).get().toPromise();
          if (facultyDoc?.exists) {
            this.selectedFaculty = { ...(facultyDoc.data() as Faculty), id: facultyDoc.id };
            this.academiaForm.patchValue({
              department: '',
              stream: '',
              selectedModule: '',
            });
            this.modules = [];
          }
        } catch (error: any) {
          await this.showToast('Error loading faculty data: ' + error.message, 'danger');
        } finally {
          loading.dismiss();
        }
      }
    });

    this.academiaForm.get('department')?.valueChanges.subscribe((departmentName) => {
      if (departmentName && this.selectedFaculty) {
        this.selectedDepartment = this.selectedFaculty.departments.find(
          (dept) => dept.name === departmentName
        ) || null;

        if (this.selectedDepartment) {
          this.availableStreams = this.selectedDepartment.streams
            ? Object.keys(this.selectedDepartment.streams)
            : [];
          
          this.loadModulesForDepartment();
        }

        this.academiaForm.patchValue({
          stream: '',
          selectedModule: '',
        });
      }
    });

    this.academiaForm.get('stream')?.valueChanges.subscribe((streamKey) => {
      if (this.selectedDepartment) {
        if (streamKey && this.selectedDepartment.streams?.[streamKey]) {
          this.selectedStream = this.selectedDepartment.streams[streamKey][0];
        } else {
          this.selectedStream = null;
        }
        this.loadModulesForDepartment(streamKey);
      }
    });

    this.academiaForm.get('selectedModule')?.valueChanges.subscribe((moduleCode) => {
      if (moduleCode) {
        const selectedModule = this.modules.find((m) => m.moduleCode === moduleCode);
        if (selectedModule) {
          this.academiaForm.get('moduleDetails')?.patchValue({
            moduleName: selectedModule.moduleName,
            moduleCode: selectedModule.moduleCode,
            moduleLevel: selectedModule.moduleLevel,
            credits: selectedModule.credits,
            year: selectedModule.year,
          });
        }
      }
    });
  }

  private async loadModulesForDepartment(streamKey?: string) {
    if (!this.selectedDepartment) return;

    this.modules = [];

    if (this.selectedDepartment.modules) {
      this.modules = [...this.selectedDepartment.modules];
    }

    if (streamKey && this.selectedDepartment.streams?.[streamKey]) {
      const streamModules = this.selectedDepartment.streams[streamKey][0]?.modules || [];
      
      const existingCodes = new Set(this.modules.map((m) => m.moduleCode));
      streamModules.forEach((module) => {
        if (!existingCodes.has(module.moduleCode)) {
          this.modules.push(module);
        }
      });
    }

    this.modules.sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));
  }


  async addModule() {
    const moduleDetails = this.academiaForm.get('moduleDetails')?.value;
  
    if (!moduleDetails.moduleName || 
        !moduleDetails.moduleCode || 
        !moduleDetails.moduleLevel || 
        !this.academiaForm.get('department')?.value) {
      alert('Please fill in all fields before submitting.');
      return;
    }
  
    const loader = await this.loadingCtrl.create({
      message: 'Submitting...',
      cssClass: 'custom-loader-class',
    });
    await loader.present();
  
    try {
      const user = firebase.auth().currentUser;
  
      if (user && user.email) {
        // Fetch the staff number based on user email
        const staffSnapshot = await this.firestore.collection('staff')
          .ref.where('email', '==', user.email)
          .get();
  
        if (staffSnapshot.empty) {
          throw new Error('Staff document not found');
        }
  
        const staffDoc = staffSnapshot.docs[0];
        const staffData = staffDoc.data() as { staffNumber: string };
        const staffNumber = staffData.staffNumber;
  
        if (!staffNumber) {
          throw new Error('Staff number not found');
        }
  
        // Reference to the assignedLectures document
        const staffDocRef = this.firestore.collection('assignedLectures').doc(staffNumber);
        
        // Get the DocumentSnapshot as a promise, not as an observable
        const staffAssignedDoc = await staffDocRef.get().toPromise();
  
        const moduleData = {
          moduleName: moduleDetails.moduleName,
          moduleCode: moduleDetails.moduleCode,
          moduleLevel: moduleDetails.moduleLevel,
          userEmail: user.email,
          department: this.academiaForm.get('department')?.value,
          faculty: this.selectedFaculty?.id, // Ensure only faculty ID is stored
          scannerOpenCount: 0,
        };
  
        // Check if the document exists
        if (staffAssignedDoc && staffAssignedDoc.exists) {
          // If document exists, add to existing modules array
          await staffDocRef.update({
            modules: firebase.firestore.FieldValue.arrayUnion(moduleData),
          });
        } else {
          // If document doesn't exist, create new one with modules array
          await staffDocRef.set({
            modules: [moduleData],
          });
        }
  
        // Clear form fields
        this.academiaForm.reset(); // Reset the entire form
        alert('Module successfully saved');
  
        // Refresh the modules data using the staff number
        this.getData(staffNumber);
      } else {
        alert('User not logged in.');
      }
    } catch (error) {
      console.error('Error saving module:', error);
      alert('An error occurred while saving the module: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      loader.dismiss();  // Ensure the loader is dismissed
    }
  }

  private async getData(staffNumber: string) {
    // Add logic to retrieve data for the given staff number.
    console.log('Data retrieval for staff number:', staffNumber);
    // Use firestore to fetch necessary data here if needed.
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 2000,
    });
    await toast.present();
  }

  clear() {
    this.academiaForm.reset();
    this.modules = [];
    this.selectedFaculty = null;
    this.selectedDepartment = null;
    this.selectedStream = null;
    this.availableStreams = [];
  }
}






   