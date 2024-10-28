import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';
import { FacultyDepartmentService } from '../services/faculty-department.service';

@Component({
  selector: 'app-super-analytics',
  templateUrl: './super-analytics.page.html',
  styleUrls: ['./super-analytics.page.scss'],
})
export class SuperAnalyticsPage implements OnInit {
  facultyName: string = '';
  departmentName: string = '';
  courseName: string = '';
  streamName: string = '';
  moduleName: string = '';
  moduleCode: string = '';
  credits: number | undefined;
  year: string = '';

  faculties: string[] = [
    'Faculty of Management Science',
    'Faculty of Engineering',
    'Faculty of Applied and Health Science'
  ];

  facultyDepartments: { [key: string]: string[] } = {
    'Faculty of Management Science': ['Accounting and Law', 'Human Resource Management'],
    'Faculty of Engineering': ['Civil Engineering', 'Chemical Engineering'],
    'Faculty of Applied and Health Science': ['Agriculture', 'Biomedical Sciences']
  };

  courses: string[] = ['Advanced', 'Diploma', 'Access'];
  departments: string[] = [];

  constructor(
    private firestore: AngularFirestore,
    private toastController: ToastController,
    private facultyDepartmentService: FacultyDepartmentService
  ) {}

  ngOnInit(): void {
    this.faculties = this.facultyDepartmentService.getFaculties();
  }

  onFacultyChange() {
    if (this.facultyName) {
      this.departments = this.facultyDepartmentService.getDepartments(this.facultyName);
    } else {
      this.departments = [];
    }
  }

  async addModule() {
    if (!this.facultyName || !this.departmentName || !this.courseName || !this.moduleName || !this.credits || !this.year) {
      this.showToast('Please fill in all required fields');
      return;
    }

    const facultyDocRef = this.firestore.collection('faculties').doc(this.facultyName);

    try {
      const docSnapshot = await facultyDocRef.get().toPromise();
      if (docSnapshot?.exists) {
        await this.processFacultyDocument(facultyDocRef, docSnapshot.data());
      } else {
        await this.createNewFacultyStructure(facultyDocRef);
      }
    } catch (error) {
      this.showToast('Error: ' + error);
    }
  }

  private async createNewFacultyStructure(facultyDocRef: any) {
    const streamKey = this.streamName || 'No Stream';
    const newFacultyData = {
      Departments: [{
        name: this.departmentName,
        courseName: this.courseName,  // Add course at department level
        streams: {
          [streamKey]: [{
            module: this.moduleName,
            moduleCode: this.moduleCode,
            credits: this.credits,
            year: this.year
          }]
        }
      }]
    };

    try {
      await facultyDocRef.set(newFacultyData);
      this.showToast('Faculty created and module added successfully');
    } catch (error) {
      this.showToast('Error creating faculty: ' + error);
    }
  }

  private async processFacultyDocument(facultyDocRef: any, facultyData: any) {
    let departmentData = facultyData['Departments'] || [];
    const departmentIndex = departmentData.findIndex((dep: { name: string; courseName: string; }) => 
      dep.name === this.departmentName && dep.courseName === this.courseName
    );

    const moduleData = {
      module: this.moduleName,
      moduleCode: this.moduleCode,
      credits: this.credits,
      year: this.year
    };

    const streamKey = this.streamName || 'No Stream';

    if (departmentIndex !== -1) {
      // Department and course combination exists
      const department = departmentData[departmentIndex];
      
      if (!department.streams) {
        department.streams = {};
      }

      if (!department.streams[streamKey]) {
        department.streams[streamKey] = [];
      }

      // Check if module already exists
      const moduleExists = department.streams[streamKey].some(
        (mod: any) => mod.module === this.moduleName
      );

      if (!moduleExists) {
        department.streams[streamKey].push(moduleData);
      } else {
        this.showToast('Module already exists in this department, course and stream');
        return;
      }

    } else {
      // Create new department with course and module
      departmentData.push({
        name: this.departmentName,
        courseName: this.courseName,
        streams: {
          [streamKey]: [moduleData]
        }
      });
    }

    try {
      await facultyDocRef.update({ Departments: departmentData });
      this.showToast('Module added successfully');
    } catch (error) {
      this.showToast('Error updating faculty: ' + error);
    }
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000
    });
    toast.present();
  }
}