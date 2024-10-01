import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Chart } from 'chart.js';
// import { EnrolledModule } from '../view-students/view-students.page';


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
  showProgressBar: boolean = false; // Control the visibility of the progress bar

  constructor(
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth
  ) { }

  ngOnInit() {
    this.afAuth.currentUser
      .then(user => {
        if (user) {
          this.studentEmail = user.email || ''; // Get the logged-in user's email
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
        const moduleData = moduleDoc.data() as EnrolledModule; // Type assertion
        const moduleCodes = moduleData.moduleCode;
  
        if (moduleCodes) {
          modules.push(...moduleCodes);
          this.totalRequiredAttendance += moduleCodes.length * 10; // Each module needs 10 attendances
        }
      }
  
      const uniqueModules = Array.from(new Set(modules));
  
      for (const moduleCode of uniqueModules) {
        const attendedDoc = await this.firestore.collection('Attended').doc(moduleCode).get().toPromise();
  
        if (!attendedDoc || !attendedDoc.exists) {
          attendanceCounts.push(0); // No records found for this module
          continue;
        }
  
        const dates = attendedDoc.data() as AttendanceData; // Type assertion
        let count = 0;
  
        // Count attendance occurrences for this student
        for (const emailArray of Object.values(dates)) {
          count += emailArray.filter(email => email === this.studentEmail).length;
        }
  
        attendanceCounts.push(count);
        this.totalAttendance += count;
  
        if (count > maxAttendanceCount) {
          maxAttendanceCount = count;
        }
      }
  
      console.log('Modules:', uniqueModules);
      console.log('Attendance Counts:', attendanceCounts);
      console.log('Total Attendance:', this.totalAttendance);
      console.log('Total Required Attendance:', this.totalRequiredAttendance);
  
      this.createChart(uniqueModules, attendanceCounts, maxAttendanceCount);
    } catch (error) {
      console.error('Error fetching attendance data: ', error);
    }
  }

  toggleProgressBar() {
    this.showProgressBar = !this.showProgressBar;
    if (this.showProgressBar) {
      // Delay to ensure the progress bar is rendered before calculating
      setTimeout(() => {
        this.calculateProgress();
      }, 0);
    }
  }

  calculateProgress() {
    const progressPercentage = (this.totalAttendance / this.totalRequiredAttendance) * 100;
    this.updateProgressBar(progressPercentage);
  }

  updateProgressBar(percentage: number) {
    const progressBar = document.getElementById('attendanceProgressBar') as HTMLDivElement;

    if (progressBar) {
      this.progressPercentage = Math.round(percentage); // Store percentage for display
      progressBar.style.width = `${percentage}%`; // Animate width based on percentage
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
        labels: modules, // X-axis labels: Module names
        datasets: [{
          label: 'Student Attendance', // Y-axis label
          data: attendanceCounts, // Attendance data
          backgroundColor: '#ff9800', // Bar color (Primary shade color)
          // borderColor: '#ff9800;', // Bar border color (Primary shade color)
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: maxAttendanceCount > 0 ? maxAttendanceCount : 10, // Ensure minimum value
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
