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
  streamName: string = '';
  moduleName: string = '';
  credits: number | undefined;
  year: string = '';

  faculties: string[] = [
    'Faculty of Management Science',
    'Faculty of Engineering',
    'Faculty of Applied and Health Science'
  ];

  facultyDepartments: { [key: string]: string[] } = {
    'Faculty of Management Science': ['Accounting and Law', 'Human Resource Management', 'Marketing', 'Office Management and Technology', 'Public Administration and Economics'],
    'Faculty of Engineering': ['Civil Engineering and Survey', 'Electrical Engineering', 'Mechanical Engineering', 'Chemical Engineering', 'Building and Construction'],
    'Faculty of Applied and Health Science': ['Agriculture', 'Biomedical Sciences', 'Chemistry', 'Community Extension', 'Environmental Health', 'Information and Communication Technology', 'Nature Conservation']
  };

  departments: string[] = [];

  constructor(private firestore: AngularFirestore, private toastController: ToastController, private facultyDepartmentService: FacultyDepartmentService) {}

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
    if (this.facultyName && this.departmentName && this.moduleName && this.credits && this.year) {
      const facultyDocRef = this.firestore.collection('faculties').doc(this.facultyName);
      facultyDocRef.get().subscribe(docSnapshot => {
        if (docSnapshot.exists) {
          this.processFacultyDocument(facultyDocRef, docSnapshot.data());
        } else {
          const newFacultyData: any = {
            Departments: [
              {
                name: this.departmentName,
                streams: {}
              }
            ]
          };

          if (this.streamName) {
            newFacultyData.Departments[0].streams[this.streamName] = [
              {
                module: this.moduleName,
                credits: this.credits,
                year: this.year
              }
            ];
          } else {
            newFacultyData.Departments[0].streams['No Stream'] = [
              {
                module: this.moduleName,
                credits: this.credits,
                year: this.year
              }
            ];
          }

          facultyDocRef.set(newFacultyData).then(() => {
            this.showToast('Faculty created and module added successfully');
          }).catch(error => {
            this.showToast('Error creating faculty: ' + error);
          });
        }
      });
    } else {
      this.showToast('Please fill in all fields');
    }
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000
    });
    toast.present();
  }

  processFacultyDocument(facultyDocRef: any, facultyData: any) {
    let departmentData = facultyData['Departments'] || [];
    const departmentIndex = departmentData.findIndex((dep: { name: string; }) => dep.name === this.departmentName);
    
    if (departmentIndex !== -1) {
      const department = departmentData[departmentIndex];
      if (!department.streams) {
        department.streams = {};
      }

      if (this.streamName) {
        if (!department.streams[this.streamName]) {
          department.streams[this.streamName] = [];
        }
        department.streams[this.streamName].push({
          module: this.moduleName,
          credits: this.credits,
          year: this.year
        });
      } else {
        if (!department.streams['No Stream']) {
          department.streams['No Stream'] = [];
        }
        department.streams['No Stream'].push({
          module: this.moduleName,
          credits: this.credits,
          year: this.year
        });
      }

      departmentData[departmentIndex] = department;
      facultyDocRef.update({ Departments: departmentData }).then(() => {
        this.showToast('Module added successfully');
      }).catch((error: string) => {
        this.showToast('Error adding module: ' + error);
      });
    } else {
      const newDepartment: any = {
        name: this.departmentName,
        streams: {}
      };

      if (this.streamName) {
        newDepartment.streams[this.streamName] = [
          {
            module: this.moduleName,
            credits: this.credits,
            year: this.year
          }
        ];
      } else {
        newDepartment.streams['No Stream'] = [
          {
            module: this.moduleName,
            credits: this.credits,
            year: this.year
          }
        ];
      }

      departmentData.push(newDepartment);
      facultyDocRef.update({ Departments: departmentData }).then(() => {
        this.showToast('Department and module added successfully');
      }).catch((error: string) => {
        this.showToast('Error adding department and module: ' + error);
      });
    }
  }
}
