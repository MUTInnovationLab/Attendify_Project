import { Component, OnInit } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';

interface EnrolledModule {
  email: string;
  moduleCode: string[];
}

interface AttendanceData {
  [date: string]: string[]; // Each date maps to an array of student emails
}

@Component({
  selector: 'app-student-records',
  templateUrl: './student-records.page.html',
  styleUrls: ['./student-records.page.scss'],
})
export class StudentRecordsPage implements OnInit {

  studentEmail: string = ''; 
  chart: any;
  totalAttendance: number = 0;
  totalRequiredAttendance: number = 0;
  progressPercentage: number = 0;
  showProgressBar: boolean = false; 
  moduleName: string ="";

  constructor(
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth
  ) { }

  ngOnInit() {
    this.afAuth.currentUser
      .then(user => {
        if (user) {
          this.studentEmail = user.email || '';
          this.loadChartData();
        } else {
          console.error('No user is logged in');
        }
      })
      .catch(error => console.error('Error fetching current user: ', error));
  }

  async loadChartData() {
    try {
      if (!this.studentEmail) {
        console.error('Student email is not set');
        return;
      }

      // Fetch enrolled modules
      const enrolledModulesSnapshot = await this.firestore.collection('enrolledModules', ref => ref.where('email', '==', this.studentEmail)).get().toPromise();

      if (!enrolledModulesSnapshot || enrolledModulesSnapshot.empty) {
        console.error('No enrolled modules found for student');
        return;
      }

      const modules: string[] = [];
      const attendanceCounts: number[] = [];
      let maxAttendanceCount = 0;

      for (const moduleDoc of enrolledModulesSnapshot.docs) {
        const moduleData = moduleDoc.data() as EnrolledModule;
        const moduleCodes = moduleData.moduleCode;

        if (moduleCodes) {
          modules.push(...moduleCodes);
        }
      }

      const uniqueModules = Array.from(new Set(modules));

      for (const moduleId of uniqueModules) {
        // Fetch attendance count from the 'Attended' collection using moduleCode as the document ID
        const attendedDoc = await this.firestore.collection('Attended').doc(moduleId).get().toPromise();
        
        // Fetch the default document ID from the 'modules' collection using moduleCode as a field
        const modulesSnapshot = await this.firestore.collection('modules', ref => ref.where('moduleCode', '==', moduleId)).get().toPromise();
        
        let attendanceCount = 0;
        let scannerOpenCount = 0;
    
        // Handle attendance data from 'Attended' collection
        if (attendedDoc && attendedDoc.exists) {
            const dates = attendedDoc.data() as AttendanceData;
            for (const emailArray of Object.values(dates)) {
                attendanceCount += emailArray.filter(email => email === this.studentEmail).length;
            }
        }
    
        // Handle scannerOpenCount from 'modules' collection (with added safety checks for undefined)
        if (modulesSnapshot && !modulesSnapshot.empty) {
            const moduleDoc = modulesSnapshot.docs[0]; // Assuming one document matches the query
            const moduleData = moduleDoc.data() as any;
            scannerOpenCount = moduleData.scannerOpenCount || 0;
        } else {
            console.error(`No module found for moduleCode: ${moduleId}`);
        }
    
        attendanceCounts.push(attendanceCount);
        this.totalAttendance += attendanceCount;
        this.totalRequiredAttendance += scannerOpenCount;
    
        if (attendanceCount > maxAttendanceCount) {
            maxAttendanceCount = attendanceCount;
        }
    }
    

      console.log('Modules:', uniqueModules);
      console.log('Attendance Counts:', attendanceCounts);
      console.log('Total Attendance:', this.totalAttendance);
      console.log('Total Required Attendance:', this.totalRequiredAttendance);

      this.calculateProgress();  // Calculate progress after fetching all data
      this.createChart(uniqueModules, attendanceCounts, maxAttendanceCount);
    } catch (error) {
      console.error('Error fetching attendance data: ', error);
    }
  }  

  toggleProgressBar() {
    this.showProgressBar = !this.showProgressBar;
    if (this.showProgressBar) {
      setTimeout(() => {
        this.calculateProgress();
      }, 0);
    }
  }

  calculateProgress() {
    if (this.totalRequiredAttendance > 0) {
      this.progressPercentage = (this.totalAttendance / this.totalRequiredAttendance) * 100;
      this.updateProgressBar(this.progressPercentage);
    } else {
      console.error('Total required attendance is zero or invalid');
    }
  }

  updateProgressBar(percentage: number) {
    const progressBar = document.getElementById('attendanceProgressBar') as HTMLDivElement;

    if (progressBar) {
      this.progressPercentage = Math.round(percentage); 
      progressBar.style.width = `${percentage}%`; 
    } else {
      console.error('Progress bar element not found');
    }
  }

  createChart(modules: string[], attendanceCounts: number[], maxAttendanceCount: number) {
    const ctx = document.getElementById('modulesChart') as HTMLCanvasElement;
    if (!ctx) {
      console.error('Canvas element not found');
      return;
    }

    if (this.chart) {
      this.chart.destroy();
    }

    console.log('Creating chart with data:', { modules, attendanceCounts });

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: modules, 
        datasets: [{
          label: 'Student Attendance',
          data: attendanceCounts,
          backgroundColor: '#ff9800', 
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: maxAttendanceCount > 0 ? maxAttendanceCount : 10,
            title: {
              display: true,
              text: 'Attendance Count'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Modules'
            }
          }
        }
      }
    });
  }
}
