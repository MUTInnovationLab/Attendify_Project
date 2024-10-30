import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, LoadingController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FacultyService } from '../services/faculty.service';

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
    private facultyService: FacultyService,
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
      selectedModule: [''],
      moduleDetails: this.fb.group({
        moduleName: ['', Validators.required],
        moduleCode: ['', Validators.required],
        moduleLevel: ['', Validators.required],
        credits: [null, [Validators.required, Validators.min(1)]],
        year: [null, Validators.required]
      })
    });
  }

  async loadFaculties() {
    const loading = await this.loadingCtrl.create({
      message: 'Loading faculties...'
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
          message: 'Loading faculty data...'
        });
        await loading.present();

        try {
          const facultyDoc = await this.firestore.collection('faculties').doc(facultyId).get().toPromise();
          if (facultyDoc?.exists) {
            this.selectedFaculty = { ...(facultyDoc.data() as Faculty), id: facultyDoc.id };
            this.academiaForm.patchValue({
              department: '',
              stream: '',
              selectedModule: ''
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
          selectedModule: ''
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
        const selectedModule = this.modules.find(m => m.moduleCode === moduleCode);
        if (selectedModule) {
          this.academiaForm.get('moduleDetails')?.patchValue({
            moduleName: selectedModule.moduleName,
            moduleCode: selectedModule.moduleCode,
            moduleLevel: selectedModule.moduleLevel,
            credits: selectedModule.credits,
            year: selectedModule.year
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
      
      const existingCodes = new Set(this.modules.map(m => m.moduleCode));
      streamModules.forEach(module => {
        if (!existingCodes.has(module.moduleCode)) {
          this.modules.push(module);
        }
      });
    }

    this.modules.sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));
  }

  async addModule() {
    if (!this.academiaForm.valid) {
      await this.showToast('Please fill all required fields', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Adding module...'
    });
    await loading.present();

    try {
      const formData = this.academiaForm.value;
      const moduleData: Module = formData.moduleDetails;
      const streamKey = formData.stream || undefined;

      await this.facultyService.addModule(
        formData.faculty,
        formData.department,
        moduleData,
        streamKey
      );

      await this.showToast('Module added successfully!', 'success');
      this.loadModulesForDepartment(streamKey);
      this.academiaForm.get('moduleDetails')?.reset();
    } catch (error: any) {
      await this.showToast('Error adding module: ' + error.message, 'danger');
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
