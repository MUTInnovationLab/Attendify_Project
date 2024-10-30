import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, LoadingController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';

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

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
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
      selectedModule: ['', Validators.required], // New module selection control
      moduleDetails: this.fb.group({
        moduleName: ['', Validators.required],
        moduleCode: ['', Validators.required],
        moduleLevel: ['', Validators.required],
        credits: [null, [Validators.required, Validators.min(1)]],
        year: [null, Validators.required]
      })
    });
  }

  private setupFormListeners() {
    this.academiaForm.get('faculty')?.valueChanges.subscribe(facultyId => {
      if (facultyId) {
        this.selectedFaculty = this.faculties.find(f => f.id === facultyId) || null;
        this.academiaForm.patchValue({ department: '', stream: '', selectedModule: '' });
      }
    });

    this.academiaForm.get('department')?.valueChanges.subscribe(deptName => {
      if (deptName && this.selectedFaculty) {
        this.selectedDepartment = this.selectedFaculty.departments.find(d => d.name === deptName) || null;
        this.availableStreams = this.selectedDepartment?.streams ? Object.keys(this.selectedDepartment.streams) : [];
        this.academiaForm.patchValue({ stream: '', selectedModule: '' });
        this.loadModules(); // Load modules based on the selected department
      }
    });

    this.academiaForm.get('stream')?.valueChanges.subscribe(streamKey => {
      if (streamKey && this.selectedDepartment?.streams?.[streamKey]) {
        this.selectedStream = this.selectedDepartment.streams[streamKey][0];
      } else {
        this.selectedStream = null;
      }
      this.loadModules(); // Load modules based on the selected stream
    });
  }

  private loadModules() {
    if (this.selectedDepartment) {
      this.modules = this.selectedDepartment.modules || [];
      if (this.selectedStream) {
        const streamModules = this.selectedDepartment.streams?.[this.selectedStream.name]?.[0].modules || [];
        this.modules = [...this.modules, ...streamModules]; // Combine department and stream modules
      }
    }
  }

  async loadFaculties() {
    const loading = await this.loadingCtrl.create({
      message: 'Loading faculties...'
    });
    await loading.present();

    try {
      const snapshot = await this.firestore.collection('faculties').get().toPromise();
      this.faculties = snapshot?.docs.map(doc => {
        const data = doc.data() as Faculty; // Cast to Faculty
        const { id: _, ...facultyData } = data; // Remove id from data
        return {
          id: doc.id,
          ...facultyData // No conflict here
        };
      }) || [];
    } catch (error: any) {
      this.showToast('Error loading faculties: ' + error.message, 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async addModule() {
    if (!this.academiaForm.valid) {
        this.showToast('Please fill in all required fields', 'warning');
        return;
    }
  
    const loading = await this.loadingCtrl.create({
        message: 'Adding module...'
    });
    await loading.present();
  
    try {
        const formValue = this.academiaForm.value;
        const moduleData: Module = {
            ...formValue.moduleDetails,
        };
  
        const facultyRef = this.firestore.collection('faculties').doc(formValue.faculty);
        const faculty = await facultyRef.get().toPromise();
        const facultyData = faculty?.data() as Faculty;
  
        const departmentIndex = facultyData.departments.findIndex(d => d.name === formValue.department);
  
        // Check if departmentIndex is valid
        if (departmentIndex === -1) {
            this.showToast('Department not found', 'danger');
            return;
        }
  
        if (formValue.stream) {
            // Check if the stream exists before trying to access its modules
            const stream = facultyData.departments[departmentIndex].streams?.[formValue.stream];
  
            if (stream) {
                // Initialize modules if necessary
                if (!stream[0].modules) {
                    stream[0].modules = []; // Ensure modules array exists
                }
                stream[0].modules.push(moduleData);
            }
        } else {
            // Ensure modules array exists in the department
            const department = facultyData.departments[departmentIndex];
  
            // Initialize if undefined
            if (!department.modules) {
                department.modules = []; // Create an empty array if undefined
            }
  
            // Now it's safe to push the module into the department's modules array
            department.modules.push(moduleData);
        }
  
        // Save back to Firestore
        await facultyRef.update(facultyData);
        this.showToast('Module added successfully!', 'success');
    } catch (error: any) {
        this.showToast('Error adding module: ' + error.message, 'danger');
    } finally {
        loading.dismiss();
    }
}

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 2000
    });
    toast.present();
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
