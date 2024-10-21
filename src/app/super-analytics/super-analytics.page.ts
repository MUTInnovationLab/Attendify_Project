import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';

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

  constructor(private firestore: AngularFirestore, private toastController: ToastController) {}
  ngOnInit(): void {
    throw new Error('Method not implemented.');
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


  processFacultyDocument(facultyDocRef:any, facultyData: any) {
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
