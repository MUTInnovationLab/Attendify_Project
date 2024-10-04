import { Component, AfterViewInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service'; 

Chart.register(...registerables, ChartDataLabels);

interface Student {
  attendance: number;
  studentNumber: string;
  email: string;
  name: string;
  surname: string;
}

interface Lecturer {
  email: string;
  fullName: string;
  position: string;
  modules: string[];
  attendanceDates: number;
}

interface AttendanceData {
  [key: string]: string[];
}


@Component({
  selector: 'app-dept-analytics',
  templateUrl: './dept-analytics.page.html',
  styleUrls: ['./dept-analytics.page.scss'],
})
export class DeptAnalyticsPage implements AfterViewInit {
  students: Student[] = [];
  studentCount: number = 0;
  lecturerCount: number = 0;
  nonAttendingCount: number = 0;
  lecturers: Lecturer[] = [];
  currentUserDepartment: string = '';

  constructor(private firestore: AngularFirestore, private dataService: DataService, private authService: AuthService) {}

  ngAfterViewInit() {
    // this.fetchCurrentUserDepartment().then(() => {
      this.fetchStudents().then(() => {
        this.createStudentAttendanceChart();
      });
      
      this.fetchLecturers().then(() => {
        this.createLecturerAttendanceChart();
      });
  }

  async fetchStudents() {
    try {
      const enrolledStudentsSnapshot = await this.firestore.collection('enrolledModules').get().toPromise();
      const enrolledStudentsMap = new Map<string, Student>();
  
      if (enrolledStudentsSnapshot && !enrolledStudentsSnapshot.empty) {
        enrolledStudentsSnapshot.docs.forEach(doc => {
          const studentData = doc.data() as Student;
          enrolledStudentsMap.set(studentData.email, studentData);
        });
      }
  
      const attendingStudentsMap = new Map<string, number>();
  
      const attendedSnapshot = await this.firestore.collection('Attended').get().toPromise();
  
      if (attendedSnapshot && !attendedSnapshot.empty) {
        attendedSnapshot.docs.forEach(doc => {
          const dates = doc.data() as { [key: string]: string[] };
  
          Object.values(dates).forEach(emailArray => {
            emailArray.forEach(email => {
              if (email) {
                attendingStudentsMap.set(email, (attendingStudentsMap.get(email) || 0) + 1);
              }
            });
          });
        });
      }
  
      this.students = Array.from(enrolledStudentsMap.values()).map(student => ({
        ...student,
        attendance: attendingStudentsMap.get(student.email) || 0
      }));
  
      this.studentCount = this.students.length;
      this.nonAttendingCount = this.studentCount - this.students.filter(student => student.attendance > 0).length;
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  }

  async fetchLecturers() {
    try {
      const lecturersSnapshot = await this.firestore.collection('registered staff', ref => 
        ref.where('position', '==', 'lecturer')
      ).get().toPromise();
  
      if (lecturersSnapshot && !lecturersSnapshot.empty) {
        this.lecturerCount = lecturersSnapshot.size;
        console.log('Total Lecturers Count:', this.lecturerCount);
  
        const lecturersData: Lecturer[] = lecturersSnapshot.docs.map(doc => ({
          ...(doc.data() as Omit<Lecturer, 'modules' | 'attendanceDates'>),
          modules: [],
          attendanceDates: 0
        }));
  
        for (const lecturer of lecturersData) {
          const modulesSnapshot = await this.firestore.collection('modules', ref =>
            ref.where('userEmail', '==', lecturer.email)
          ).get().toPromise();
  
          if (modulesSnapshot && !modulesSnapshot.empty) {
            lecturer.modules = modulesSnapshot.docs.map(doc => doc.id);
          }
        }
  
        const attendedSnapshot = await this.firestore.collection('Attended').get().toPromise();
  
        if (attendedSnapshot && !attendedSnapshot.empty) {
          attendedSnapshot.docs.forEach(doc => {
            const moduleData = doc.data() as AttendanceData;
            Object.entries(moduleData).forEach(([moduleKey, dates]) => {
              const [lecturerEmail, moduleCode] = moduleKey.split('_');
              const lecturer = lecturersData.find(l => l.email === lecturerEmail);
              if (lecturer && lecturer.modules.includes(moduleCode)) {
                lecturer.attendanceDates += dates.length;
              }
            });
          });
        }
  
        this.lecturers = lecturersData.filter(lecturer => lecturer.attendanceDates > 0);
        console.log('Lecturers with Attendance Data:', this.lecturers);
  
        this.createLecturerAttendanceChart();
      } else {
        console.error('No lecturers data found');
      }
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    }
  }

  createStudentAttendanceChart() {
    const studentCanvas = <HTMLCanvasElement>document.getElementById('studentAttendanceChart');
    const studentCtx = studentCanvas?.getContext('2d');
  
    if (studentCtx) {
      const totalStudents = this.studentCount;
      const attendingCount = this.students.filter(student => student.attendance > 0).length;
      const notAttendingCount = totalStudents - attendingCount;
  
      const attendingPercentage = totalStudents > 0 ? (attendingCount / totalStudents) * 100 : 0;
      const notAttendingPercentage = totalStudents > 0 ? (notAttendingCount / totalStudents) * 100 : 0;
  
      new Chart(studentCtx, {
        type: 'pie',
        data: {
          labels: ['Attending', 'Not Attending'],
          datasets: [{
            data: [attendingCount, notAttendingCount],
            backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(255, 99, 132, 0.7)'],
            borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            datalabels: {
              formatter: (value: number, context: any) => {
                const total = (context.dataset.data as number[]).reduce((acc: number, val: number) => acc + val, 0);
                const percentage = total > 0 ? (value / total) * 100 : 0;
                return `${percentage.toFixed(1)}%`;
              },
              color: '#fff',
              font: { weight: 'bold' }
            }
          },
          aspectRatio: 1,
          scales: {
            x: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Students'
              }
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Student Attendance'
              }
            }
          },
        }
      });
    }
  }

  createLecturerAttendanceChart() {
    const lecturerCanvas = <HTMLCanvasElement>document.getElementById('lecturerAttendanceChart');
    const lecturerCtx = lecturerCanvas?.getContext('2d');

    if (lecturerCtx) {
      new Chart(lecturerCtx, {
        type: 'bar',
        data: {
          labels: this.lecturers.map(lecturer => lecturer.fullName),
          datasets: [{
            label: 'Lecturer Attendance',
            data: this.lecturers.map(lecturer => lecturer.attendanceDates),
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Lecturers'
              }
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Lecturer Attendance'
              }
            }
          },
          plugins: {
            datalabels: {
              anchor: 'end',
              align: 'top',
              formatter: (value: number) => `${value}`,
              color: '#000',
              font: { weight: 'bold' }
            }
          }
        }
      });
    } else {
      console.error('Failed to get the 2D context for lecturer attendance bar chart');
    }
  }

  // getProgress(email: string): number {
  //   const maxSessions = 10; 
  //   const student = this.students.find(s => s.email === email);
  //   return student ? Math.min(student.attendance / maxSessions, 1) : 0;
  // }
}
