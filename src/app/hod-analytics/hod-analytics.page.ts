import { Component, AfterViewInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../services/auth.service'; // You'll need to create this service

Chart.register(...registerables);

interface Student {
  attendance: number;
  email: string;
  name: string;
  surname: string;
  studentNumber: string;
  faculty: string;
  department: string;
}

interface Lecturer {
  email: string;
  fullName: string;
  position: string;
  staffNumber: string;
  faculty: string;
  department: string;
}

interface HOD {
  email: string;
  department: string;
  faculty: string;
}

@Component({
  selector: 'app-hod-analytics',
  templateUrl: './hod-analytics.page.html',
  styleUrls: ['./hod-analytics.page.scss'],
})
export class HodAnalyticsPage implements AfterViewInit {
  lecturers: Lecturer[] = [];
  students: Student[] = [];
  attendingStudents: string[] = [];
  studentCount: number = 0;
  lecturerCount: number = 0;
  nonAttendingCount: number = 0;
  lecturerChart: any;
  studentChart: any;
  moduleCode: string = ' ';
  currentHOD: HOD | null = null;
  departmentName: string = '';

  constructor(
    private firestore: AngularFirestore, 
    private router: Router,
    private authService: AuthService
  ) {
    this.getCurrentHOD();
  }

  async getCurrentHOD() {
    try {
      const userEmail = await this.authService.getCurrentUserEmail();
      if (!userEmail) {
        console.error('No user logged in');
        this.router.navigate(['/login']);
        return;
      }
      console.log(userEmail);

      const hodDoc = await this.firestore
        .collection<HOD>('staff')
        .ref.where('email', '==', userEmail)
        .get();

      if (!hodDoc.empty) {
        this.currentHOD = hodDoc.docs[0].data() as HOD;
        this.departmentName = this.currentHOD.department;
        this.ngAfterViewInit();
      } else {
        console.error('Current user is not an HOD');
        this.router.navigate(['/unauthorized']);
      }
    } catch (error) {
      console.error('Error getting HOD details:', error);
    }
  }

  ngAfterViewInit() {
    if (this.currentHOD) {
      this.fetchData();
    }
  }

  async fetchData() {
    await this.fetchLecturers();
    await this.fetchAttendedStudents();
    this.createCharts();
  }

  async fetchLecturers() {
    try {
      const lecturersSnapshot = await this.firestore.collection<Lecturer>('staff', ref =>
        ref.where('position', 'in', ['lecturer', 'Lecturer'])
           .where('department', '==', this.currentHOD?.department)
      ).get().toPromise();
  
      if (lecturersSnapshot) {
        this.lecturers = lecturersSnapshot.docs.map(doc => doc.data() as Lecturer);
        this.lecturerCount = this.lecturers.length;
      } else {
        console.error('No lecturers data found');
      }
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    }
  }

  async fetchAttendedStudents() {
    try {
      // Fetch students from the HOD's department
      const studentsSnapshot = await this.firestore
        .collection<Student>('students', ref =>
          ref.where('department', '==', this.currentHOD?.department)
        )
        .get()
        .toPromise();
      
      if (studentsSnapshot && !studentsSnapshot.empty) {
        this.students = studentsSnapshot.docs.map(doc => doc.data() as Student);
        this.studentCount = this.students.length;

        const attendedStudentNumbers: Set<string> = new Set();

        // Fetch attendance data for the department's modules
        const attendedModulesSnapshot = await this.firestore
          .collection('Attended')
          .get()
          .toPromise();

        if (attendedModulesSnapshot && !attendedModulesSnapshot.empty) {
          for (const moduleDoc of attendedModulesSnapshot.docs) {
            const attendedData = moduleDoc.data() as Record<string, any>;
            
            for (const date in attendedData) {
              if (attendedData.hasOwnProperty(date)) {
                const studentsArray = attendedData[date];

                if (Array.isArray(studentsArray)) {
                  studentsArray.forEach(studentInfo => {
                    if (typeof studentInfo === 'object' && studentInfo.studentNumber) {
                      // Only count students from the HOD's department
                      const student = this.students.find(s => s.studentNumber === studentInfo.studentNumber);
                      if (student) {
                        attendedStudentNumbers.add(studentInfo.studentNumber);
                      }
                    }
                  });
                }
              }
            }
          }

          this.attendingStudents = Array.from(attendedStudentNumbers);
          this.updateNonAttendingCount();
        } else {
          console.error('No attendance data found in any modules.');
          this.attendingStudents = [];
          this.updateNonAttendingCount();
        }
      } else {
        console.error('No registered students data found');
        this.resetCounts();
      }
    } catch (error) {
      console.error('Error fetching attended students:', error);
    }
  }

  updateNonAttendingCount() {
    const attendingCount = this.attendingStudents.length;
    this.nonAttendingCount = this.studentCount - attendingCount;
  }

  resetCounts() {
    this.studentCount = 0;
    this.nonAttendingCount = 0;
    this.attendingStudents = [];
  }

  navigateToDeptAnalysis() {
    this.router.navigate(['/dept-an']);
  }

  createCharts() {
    this.createStudentAttendanceChart();
    this.createLecturerAttendanceChart();
  }

  createStudentAttendanceChart() {
    const studentCanvas = <HTMLCanvasElement>document.getElementById('studentAttendanceChart');
    const studentCtx = studentCanvas?.getContext('2d');

    if (studentCtx) {
      if (this.studentChart) {
        this.studentChart.destroy();
      }

      const attendingCount = this.studentCount - this.nonAttendingCount;

      this.studentChart = new Chart(studentCtx, {
        type: 'pie',
        data: {
          labels: ['Attending', 'Not Attending'],
          datasets: [{
            data: [attendingCount, this.nonAttendingCount],
            backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(255, 99, 132, 0.7)'],
            borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (tooltipItem: any) => {
                  const dataset = tooltipItem.dataset;
                  const dataIndex = tooltipItem.dataIndex;
                  const dataValue = dataset.data[dataIndex];
                  const total = dataset.data.reduce((sum: number, value: number) => sum + value, 0);
                  const percentage = ((dataValue / total) * 100).toFixed(2);
                  return `${tooltipItem.label}: ${dataValue} (${percentage}%)`;
                }
              }
            },
            legend: {
              display: true,
              position: 'top',
            }
          }
        },
      });
    }
  }

  createLecturerAttendanceChart() {
    const lecturerCanvas = <HTMLCanvasElement>document.getElementById('lecturerAttendanceChart');
    const lecturerCtx = lecturerCanvas?.getContext('2d');

    if (lecturerCtx) {
      if (this.lecturerChart) {
        this.lecturerChart.destroy();
      }

      this.lecturerChart = new Chart(lecturerCtx, {
        type: 'bar',
        data: {
          labels: this.lecturers.map(lecturer => lecturer.fullName),
          datasets: [{
            label: 'Lecturer Attendance',
            data: this.lecturers.map(() => Math.random() * 10), // Replace with actual data
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              beginAtZero: true,
            },
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }
}