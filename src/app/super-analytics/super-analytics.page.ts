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

  // List of faculties
  faculties: string[] = [
    'Faculty of Management Science',
    'Faculty of Engineering',
    'Faculty of Applied and Health Science'
  ];

  // Map faculties to their respective departments
  facultyDepartments: { [key: string]: string[] } = {
    'Faculty of Management Science': [' Accounting and Law', 'Human Resource Management', 'Marketing', 'Office Mangement and Technology', 'Public Administration and Economics'],
    'Faculty of Engineering': ['Civil Engineering  and Survey', 'Electrical Engineering', 'Mechanical Engineering','Chemical Engineering','Building and Construction' ],
    'Faculty of Applied and Health Science': ['Agriculture', 'Biomedical Sciences', 'Chemistry',' Community Extension', 'Environmental Health', 'Information and Communication Technology', 'Nature Conservation']
  };

  // List of departments based on the selected faculty
  departments: string[] = [];

  constructor(private firestore: AngularFirestore, private toastController: ToastController,
    private facultyDepartmentService: FacultyDepartmentService
  ) {}

  ngOnInit(): void {
    // Initialize component, if needed
    this.faculties = this.facultyDepartmentService.getFaculties();
  }

  onFacultyChange() {
    // Get the departments from the service based on the selected faculty
    if (this.facultyName) {
      this.departments = this.facultyDepartmentService.getDepartments(this.facultyName);
    } else {
      this.departments = [];
    }
  }

  async addModule() {
    if (this.facultyName && this.departmentName && this.streamName && this.moduleName && this.credits && this.year) {
      const facultyDocRef = this.firestore.collection('faculties').doc(this.facultyName);

      facultyDocRef.get().subscribe(docSnapshot => {
        if (docSnapshot.exists) {
          // Faculty document exists, proceed with adding module
          this.processFacultyDocument(facultyDocRef, docSnapshot.data());
        } else {
          // Faculty document does not exist, create a new one
          const newFacultyData = {
            Departments: [
              {
                name: this.departmentName,
                streams: {
                  [this.streamName]: [
                    {
                      module: this.moduleName,
                      credits: this.credits,
                      year: this.year
                    }
                  ]
                }
              }
            ]
          };

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

      if (!department.streams[this.streamName]) {
        department.streams[this.streamName] = [];
      }

      // Add the new module to the stream
      department.streams[this.streamName].push({
        module: this.moduleName,
        credits: this.credits,
        year: this.year
      });

      departmentData[departmentIndex] = department;

      // Update the faculty document
      facultyDocRef.update({ Departments: departmentData }).then(() => {
        this.showToast('Module added successfully');
      }).catch((error: string) => {
        this.showToast('Error adding module: ' + error);
      });
    } else {
      // If department not found, create it
      departmentData.push({
        name: this.departmentName,
        streams: {
          [this.streamName]: [
            {
              module: this.moduleName,
              credits: this.credits,
              year: this.year
            }
          ]
        }
      });

      // Update faculty document with new department and streams
      facultyDocRef.update({ Departments: departmentData }).then(() => {
        this.showToast('Department and module added successfully');
      }).catch((error: string) => {
        this.showToast('Error adding department and module: ' + error);
      });
    }
  }
}
