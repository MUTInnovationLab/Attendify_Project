import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/internal/Subscription';

interface EnrolledStudent {
  studentNumber: string;
  status: string;
}

interface ModuleData {
  Enrolled?: {
    [key: string]: EnrolledStudent;
  };
}

interface StudentData {
  email: string;
  name: string;
  studentNumber: string;
  surname: string;
  moduleCode: string;
  department?: string;
}

interface AttendanceRecord {
  scanDate: string;
  scanTime: string;
  studentNumber: string;
}

interface ModuleInfo {
  department: string;
  faculty: string;
  moduleCode: string;
  moduleLevel: string;
  moduleName: string;
  scannerOpenCount: number;
  userEmail: string;
}

interface AssignedLecturesDoc {
  modules: ModuleInfo[];
}

@Component({
  selector: 'app-student-records',
  templateUrl: './student-records.page.html',
  styleUrls: ['./student-records.page.scss'],
})
export class StudentRecordsPage implements OnInit {
  // currentUser: StudentData | null = null;
  private authSubscription: Subscription | undefined;
  private studentsCollection: AngularFirestoreCollection<StudentData> | undefined;
  showUserInfo = false;
  currentUser: StudentData = { moduleCode: '', email: '', name: '', studentNumber: '', surname: '' };

  @ViewChild('modulesChart', { static: false })
  chartCanvas!: ElementRef;
  studentNumber: string = ' ';
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
  ) {
    this.studentsCollection = this.firestore.collection<StudentData>('students');
   }

  toggleUserInfo() {
    this.showUserInfo = !this.showUserInfo;
  }

  ngOnInit() {
    this.authSubscription = this.afAuth.authState.subscribe(user => {
        if (user) {
            this.studentEmail = user.email || '';
            this.getCurrentUser(); // Get user details
            this.loadChartData(); // Load additional data
        } else {
            console.error('No user is logged in');
        }
    });
}

ngOnDestroy() {
    if (this.authSubscription) {
        this.authSubscription.unsubscribe(); // Unsubscribe to prevent memory leaks
    }
}

  getCurrentUser() {
    return new Promise<StudentData>(async (resolve, reject) => {
        const unsubscribe = await this.auth.onAuthStateChanged(async (user) => {
            try {
                if (!user?.email) {
                    console.log('No user is signed in or email is missing');
                    reject(new Error('No authenticated user found'));
                    return;
                }

                console.log('User signed in:', user.email);

                // Query the students collection by email
                const querySnapshot = await this.firestore
                    .collection<StudentData>('students', ref => ref.where('email', '==', user.email))
                    .get()
                    .toPromise();

                if (!querySnapshot || querySnapshot.empty) {
                    console.log('No user found with email:', user.email);
                    reject(new Error('No user found in students collection'));
                    return;
                }

                const userData = querySnapshot.docs[0].data() as StudentData;

                // Debug: Log the user data for inspection
                console.log('User data retrieved:', userData);

                // You can access studentNumber here
                const studentNumber = userData.studentNumber;

                this.currentUser = userData;  // Set the current user data
                console.log('Current User:', this.currentUser);

                // Load additional data if needed
                await this.loadChartData();
                resolve(userData);  // Resolve the promise with userData
            } catch (error) {
                console.error('Error in getCurrentUser:', error);
                reject(error);
            } finally {
                unsubscribe();
            }
        });
    });
}

  async loadChartData() {
    try {
      // Handle the null case explicitly
      if (!this.currentUser) {
        throw new Error('Current user is not set');
      }

      console.log('Loading chart data for student:', this.currentUser.studentNumber);
      
      
      const modules: string[] = [];
      const attendanceCounts: number[] = [];
      let maxAttendanceCount = 0;
      this.totalAttendance = 0;
      this.totalRequiredAttendance = 0;
  
      const enrolledModulesSnapshot = await this.firestore.collection('enrolledModules').get().toPromise();
  
      if (!enrolledModulesSnapshot || enrolledModulesSnapshot.empty) {
        console.error('No enrolled modules found');
        return;
      }
  
      for (const moduleDoc of enrolledModulesSnapshot.docs) {
        const moduleId = moduleDoc.id;
        const moduleData = moduleDoc.data() as ModuleData;
  
        if (moduleData && moduleData.Enrolled) {
          const enrolledStudents = Object.values(moduleData.Enrolled);
          const isEnrolled = enrolledStudents.some(student => 
            student.studentNumber === this.currentUser.studentNumber && student.status === 'Enrolled'
          );
  
          if (isEnrolled) {
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
    try {
      const attendedDoc = await this.firestore.collection('Attended').doc(moduleId).get().toPromise();
      if (attendedDoc && attendedDoc.exists) {
        const attendanceData = attendedDoc.data() as Record<string, AttendanceRecord[]>;
        let count = 0;
        
        for (const date in attendanceData) {
          const records = attendanceData[date];
          count += records.filter(record => record.studentNumber === this.currentUser?.studentNumber).length;
        }
        
        return count;
      }
    } catch (error) {
      console.error(`Error fetching attendance for module ${moduleId}:`, error);
    }
    return 0;
  }

  async getScannerOpenCount(moduleId: string): Promise<number> {
    try {
      // 1. First check if student has any attendance records for this module
      const attendedDoc = await this.firestore
        .collection('Attended')
        .doc(moduleId)
        .get()
        .toPromise();
  
      if (!attendedDoc?.exists) {
        console.log(`No attendance records found for module ${moduleId}`);
        return 0;
      }
  
      // 2. Get the assignedLectures documents
      const assignedLecturesSnapshot = await this.firestore
        .collection('assignedLectures')
        .get()
        .toPromise();
  
      // Check if snapshot exists and has documents
      if (!assignedLecturesSnapshot || assignedLecturesSnapshot.empty) {
        console.log('No assigned lectures found');
        return 0;
      }
  
      let totalScannerCount = 0;
  
      // Loop through all documents in assignedLectures
      assignedLecturesSnapshot.docs.forEach(doc => {
        const data = doc.data() as AssignedLecturesDoc;
        
        // Check if data and modules array exists
        if (data && Array.isArray(data.modules)) {
          // Loop through modules array
          data.modules.forEach(module => {
            // If this module matches our moduleId
            if (module.moduleCode === moduleId) {
              totalScannerCount += module.scannerOpenCount || 0;
              console.log(`Found scannerOpenCount ${module.scannerOpenCount} for module ${moduleId}`);
            }
          });
        }
      });
  
      console.log(`Total scanner count for module ${moduleId}: ${totalScannerCount}`);
      return totalScannerCount;
    } catch (error) {
      console.error(`Error fetching scanner count for module ${moduleId}:`, error);
      return 0;
    }
  }
  
  async calculateTotalRequiredAttendance(): Promise<number> {
    try {
      // 1. Get all modules from Attended collection
      const attendedSnapshot = await this.firestore
        .collection('Attended')
        .get()
        .toPromise();
  
      // Check if snapshot exists and has documents
      if (!attendedSnapshot || attendedSnapshot.empty) {
        console.log('No attended modules found');
        return 0;
      }
  
      let totalRequired = 0;
  
      // Use Promise.all to handle multiple async operations
      const counts = await Promise.all(
        attendedSnapshot.docs.map(async (doc) => {
          const moduleId = doc.id;
          return await this.getScannerOpenCount(moduleId);
        })
      );

      
  
      // Sum up all the counts
      totalRequired = counts.reduce((sum, count) => sum + count, 0);
  
      console.log('Total required attendance across all modules:', totalRequired);
      return totalRequired;
    } catch (error) {
      console.error('Error calculating total required attendance:', error);
      return 0;
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
      this.progressPercentage = Math.round((this.totalAttendance / this.totalRequiredAttendance) * 100);
      this.updateProgressBar(this.progressPercentage);
    } else {
      // console.error(' ');
    }
  }
  
  updateProgressBar(percentage: number) {
    const progressBar = document.getElementById('attendanceProgressBar');
    if (!progressBar) {
      // console.error('Progress bar element not found');
      return;
    }
    const progressFill = progressBar.querySelector('.progress-fill') as HTMLDivElement;
    const progressText = progressBar.querySelector('.progress-text') as HTMLSpanElement;
  
    if (progressFill && progressText) {
      progressFill.style.width = `${percentage}%`;
      progressText.textContent = `${percentage}%`;
  
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