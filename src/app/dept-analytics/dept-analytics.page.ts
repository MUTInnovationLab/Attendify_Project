import { Component, AfterViewInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { AngularFirestore } from '@angular/fire/compat/firestore';

Chart.register(...registerables);

interface Student {
  attendance: number;
  email: string;
  name: string;
  surname: string;
  studentNumber: string;
  faculty: string;
}

interface Lecturer {
  email: string;
  fullName: string;
  position: string;
  staffNumber: string;
  faculty: string;
}

@Component({
  selector: 'app-dept-analytics',
  templateUrl: './dept-analytics.page.html',
  styleUrls: ['./dept-analytics.page.scss'],
})
export class DeptAnalyticsPage implements AfterViewInit {
  lecturers: Lecturer[] = [];
  students: Student[] = [];
  attendingStudents: string[] = [];
  studentCount: number = 0;
  lecturerCount: number = 0;
  nonAttendingCount: number = 0;
  lecturerChart: any;
  studentChart: any;
  moduleCode: string = ' ';
  selectedFaculty: string = 'All';
  faculties: string[] = ['All','Faculty of ICT', 'Faculty of Engineering', 'Faculty of Management Science', 'Faculty of Applied and Health Science'];

  constructor(private firestore: AngularFirestore) {}

  ngAfterViewInit() {
    this.fetchData();
  }

  async fetchData() {
    await this.fetchLecturers();
    await this.fetchAttendedStudents();
    this.createCharts();
  }

  async fetchLecturers() {
    try {
      const lecturersSnapshot = await this.firestore.collection<Lecturer>('staff', ref => 
        ref.where('position', '==', 'lecturer')
      ).get().toPromise();

      if (lecturersSnapshot) {
        this.lecturers = lecturersSnapshot.docs.map(doc => doc.data() as Lecturer);
        this.updateLecturerCount();
      } else {
        console.error('No lecturers data found');
      }
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    }
  }

  async fetchAttendedStudents() {
    try {
      // Step 1: Fetch all registered students
      const studentsSnapshot = await this.firestore.collection('students').get().toPromise();
      
      if (studentsSnapshot && !studentsSnapshot.empty) {
        this.students = studentsSnapshot.docs.map(doc => doc.data() as Student);
        this.updateStudentCount();

        const attendedStudentNumbers: Set<string> = new Set();

        const attendedModulesSnapshot = await this.firestore.collection('Attended').get().toPromise();

        if (attendedModulesSnapshot && !attendedModulesSnapshot.empty) {
          for (const moduleDoc of attendedModulesSnapshot.docs) {
            const attendedData = moduleDoc.data() as Record<string, any>;
            
            for (const date in attendedData) {
              if (attendedData.hasOwnProperty(date)) {
                const studentsArray = attendedData[date];

                if (Array.isArray(studentsArray)) {
                  studentsArray.forEach(studentInfo => {
                    if (typeof studentInfo === 'object' && studentInfo.studentNumber) {
                      attendedStudentNumbers.add(studentInfo.studentNumber);
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

  updateLecturerCount() {
    this.lecturerCount = this.selectedFaculty === 'All' 
      ? this.lecturers.length 
      : this.lecturers.filter(l => l.faculty === this.selectedFaculty).length;
  }

  updateStudentCount() {
    this.studentCount = this.selectedFaculty === 'All' 
      ? this.students.length 
      : this.students.filter(s => s.faculty === this.selectedFaculty).length;
  }

  updateNonAttendingCount() {
    const attendingCount = this.selectedFaculty === 'All' 
      ? this.attendingStudents.length 
      : this.attendingStudents.filter(email => 
          this.students.find(s => s.email === email && s.faculty === this.selectedFaculty)
        ).length;
    this.nonAttendingCount = this.studentCount - attendingCount;
  }

  resetCounts() {
    this.studentCount = 0;
    this.nonAttendingCount = 0;
    this.attendingStudents = [];
  }

  onFacultyChange() {
    this.updateLecturerCount();
    this.updateStudentCount();
    this.updateNonAttendingCount();
    this.createCharts();
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
    } else {
      console.error('Failed to get the 2D context for student attendance pie chart');
    }
  }

  createLecturerAttendanceChart() {
    const lecturerCanvas = <HTMLCanvasElement>document.getElementById('lecturerAttendanceChart');
    const lecturerCtx = lecturerCanvas?.getContext('2d');

    if (lecturerCtx) {
      if (this.lecturerChart) {
        this.lecturerChart.destroy();
      }

      const filteredLecturers = this.selectedFaculty === 'All' 
        ? this.lecturers 
        : this.lecturers.filter(l => l.faculty === this.selectedFaculty);

      this.lecturerChart = new Chart(lecturerCtx, {
        type: 'bar',
        data: {
          labels: filteredLecturers.map(lecturer => lecturer.fullName),
          datasets: [{
            label: 'Lecturer Attendance',
            data: filteredLecturers.map(() => Math.random() * 10), // Replace with actual data
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
    } else {
      console.error('Failed to get the 2D context for lecturer attendance bar chart');
    }
  }
  
}
