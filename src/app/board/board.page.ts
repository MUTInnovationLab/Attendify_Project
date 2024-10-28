import { Component, OnInit } from '@angular/core';
import { FacultyService } from '../services/faculty.service';
import { ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-board',
  templateUrl: './board.page.html',
  styleUrls: ['./board.page.scss'],
})
export class BoardPage implements OnInit {
  academiaForm!: FormGroup; // Using definite assignment assertion
  faculties: string[] = [];
  departments: string[] = [];
  streams: string[] = [];
  modules: any[] = [];

  constructor(
    private fb: FormBuilder,
    private facultyService: FacultyService,
    private toastController: ToastController
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
      module: ['', Validators.required],
      facultyName: ['', Validators.required],
      departmentName: ['', Validators.required],
      moduleName: ['', Validators.required],
      credits: ['', [Validators.required, Validators.min(1)]],
      year: ['', Validators.required]
    });
  }

  private setupFormListeners() {
    this.academiaForm.get('faculty')?.valueChanges.subscribe(faculty => {
      if (faculty) {
        this.loadDepartments(faculty);
      }
    });

    this.academiaForm.get('department')?.valueChanges.subscribe(department => {
      if (department) {
        const faculty = this.academiaForm.get('faculty')?.value;
        if (faculty) {
          this.loadStreams(faculty, department);
        }
      }
    });

    this.academiaForm.get('stream')?.valueChanges.subscribe(stream => {
      if (stream) {
        const faculty = this.academiaForm.get('faculty')?.value;
        const department = this.academiaForm.get('department')?.value;
        if (faculty && department) {
          this.loadModules(faculty, department, stream);
        }
      }
    });
  }

  private loadFaculties() {
    this.facultyService.getFaculties().subscribe(data => {
      this.faculties = data;
    });
  }

  private loadDepartments(faculty: string) {
    this.facultyService.getDepartments(faculty).subscribe(data => {
      this.departments = data;
    });
  }

  private loadStreams(faculty: string, department: string) {
    this.facultyService.getStreams(faculty, department).subscribe(data => {
      this.streams = data;
    });
  }

  private loadModules(faculty: string, department: string, stream: string) {
    this.facultyService.getModules(faculty, department, stream).subscribe(data => {
      this.modules = data;
    });
  }

  async populate() {
    const selectedModule = this.modules.find(m => m.module === this.academiaForm.get('module')?.value);
    if (selectedModule) {
      this.academiaForm.patchValue({
        facultyName: this.academiaForm.get('faculty')?.value,
        departmentName: this.academiaForm.get('department')?.value,
        moduleName: selectedModule.module,
        credits: selectedModule.credits,
        year: selectedModule.year
      });
    }
  }

  clear() {
    this.academiaForm.reset();
  }

  async addModule() {
    if (this.academiaForm.valid) {
      try {
        await this.facultyService.addModule(this.academiaForm.value);
        this.showToast('Module added successfully');
        this.clear();
      } catch (error) {
        this.showToast('Error adding module');
      }
    } else {
      this.showToast('Please fill in all required fields');
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'dark'
    });
    toast.present();
  }
}
