import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';

interface EnrolledModule {
  email: string;
  moduleCode: string[];
}

interface StudentData {
  email: string;
  name: string;
  studentNumber: string;
  surname: string;
  moduleCode:string;
}

@Component({
  selector: 'app-student-records',
  templateUrl: './student-records.page.html',
  styleUrls: ['./student-records.page.scss'],
})
export class StudentRecordsPage implements OnInit {

  showUserInfo = false;
  currentUser: StudentData = { moduleCode: '' ,email: '', name: '', studentNumber: '', surname: '' };

  @ViewChild('modulesChart', { static: false })
  chartCanvas!: ElementRef;

  studentEmail: string = ''; 
  chart: Chart | null = null;
  totalAttendance: number = 0;
  totalRequiredAttendance: number = 0;
  progressPercentage: number = 0;
  showProgressBar: boolean = false; 

  constructor(
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,
    private auth: AngularFireAuth,
    private router: Router
  ) { }

  toggleUserInfo() {
    this.showUserInfo = !this.showUserInfo;
  }

  ngOnInit() {
    this.getCurrentUser();
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

  dismiss() {
    this.router.navigate(['/login']); // Navigate to LecturePage
  }

  getCurrentUser() {
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('User signed in:', user.email);
        this.firestore
          .collection('enrolledModules', (ref) =>
            ref.where('email', '==', user.email)
          )
          .get()
          .subscribe(
            (querySnapshot) => {
              if (querySnapshot.empty) {
                console.log('No user found with this email');
              } else {
                querySnapshot.forEach((doc) => {
                  this.currentUser = doc.data() as StudentData;
                  console.log('Current User:', this.currentUser);
                });
              }
            },
            (error) => {
              console.error('Error fetching user data:', error);
            }
          );
      } else {
        console.log('No user is signed in');
      }
    });
  }

  async loadChartData() {
    try {
      if (!this.studentEmail) {
        console.error('Student email is not set');
        return;
      }
  
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
  
        if (moduleCodes && Array.isArray(moduleCodes)) {
          for (const moduleId of moduleCodes) {
            if (typeof moduleId === 'string' && moduleId.trim() !== '') {
              const attendanceCount = await this.getAttendanceCount(moduleId);
              const scannerOpenCount = await this.getScannerOpenCount(moduleId);
  
              modules.push(moduleId);
              attendanceCounts.push(attendanceCount);
  
              this.totalAttendance += attendanceCount;
              this.totalRequiredAttendance += scannerOpenCount;
  
              if (attendanceCount > maxAttendanceCount) {
                maxAttendanceCount = attendanceCount;
              }
            }
          }
        }
      }
  
      console.log('Modules:', modules);
      console.log('Attendance Counts:', attendanceCounts);
      console.log('Total Attendance:', this.totalAttendance);
      console.log('Total Required Attendance:', this.totalRequiredAttendance);
  
      this.calculateProgress();
      this.createChart(modules, attendanceCounts, maxAttendanceCount);
    } catch (error) {
      console.error('Error fetching attendance data: ', error);
    }
  }

  async getAttendanceCount(moduleId: string): Promise<number> {
    const attendedDoc = await this.firestore.collection('Attended').doc(moduleId).get().toPromise();
    if (attendedDoc && attendedDoc.exists) {
      const attendanceData = attendedDoc.data() as any;
      if (Array.isArray(attendanceData.details)) {
        return attendanceData.details.reduce((total: number, attendance: any) => {
          return attendance.email === this.studentEmail ? total + (attendance.count || 0) : total;
        }, 0);
      }
    }
    return 0;
  }

  async getScannerOpenCount(moduleId: string): Promise<number> {
    const modulesSnapshot = await this.firestore.collection('modules', ref => ref.where('moduleCode', '==', moduleId)).get().toPromise();
    if (modulesSnapshot && !modulesSnapshot.empty) {
      const moduleDoc = modulesSnapshot.docs[0];
      const moduleData = moduleDoc.data() as any;
      return moduleData.scannerOpenCount || 0;
    }
    return 0;
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
    const progressBar = document.getElementById('attendanceProgressBar');
    if (!progressBar) {
      console.error('Progress bar element not found');
      return;
    }
    const progressFill = progressBar.querySelector('.progress-fill') as HTMLDivElement;
    const progressText = progressBar.querySelector('.progress-text') as HTMLSpanElement;
  
    if (progressFill && progressText) {
      this.progressPercentage = Math.round(percentage);
      progressFill.style.width = `${percentage}%`;
      progressText.textContent = `${this.progressPercentage}%`;
  
      let color1, color2;
      if (percentage < 30) {
        color1 = '#ff0000'; color2 = '#ff3333';
      } else if (percentage < 50) {
        color1 = '#ff6600'; color2 = '#ff9933';
      } else if (percentage < 80) {
        color1 = '#ffff00'; color2 = '#ffff66';
      } else {
        color1 = '#00cc00'; color2 = '#33ff33';
      }
  
      progressFill.style.background = `linear-gradient(to right, ${color1}, ${color2})`;
    } else {
      console.error('Progress fill or text elements not found');
    }
  }

  createChart(modules: string[], attendanceCounts: number[], maxAttendanceCount: number) {
    if (!this.chartCanvas) {
      console.error('Chart canvas element not found');
      return;
    }
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Unable to get 2D context for canvas');
      return;
    }

    if (this.chart) {
      this.chart.destroy();
    }

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
        responsive: true,
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