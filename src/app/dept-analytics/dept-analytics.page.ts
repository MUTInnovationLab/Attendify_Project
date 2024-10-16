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
}

interface Lecturer {
  email: string;
  fullName: string;
  position: string;
  staffNumber: string;
}

@Component({
  selector: 'app-dept-analytics',
  templateUrl: './dept-analytics.page.html',
  styleUrls: ['./dept-analytics.page.scss'],
})
export class DeptAnalyticsPage implements AfterViewInit {
  lecturers: Lecturer[] = [];
  students: Student[] = [];
  attendingStudents: string[] = []; // Array of emails of students who attended
  studentCount: number = 0;
  lecturerCount: number = 0;
  nonAttendingCount: number = 0;
  lecturerChart: any;
  moduleCode: string = ' '; // Set this dynamically if needed

  constructor(private firestore: AngularFirestore) {}

  ngAfterViewInit() {
    this.fetchLecturers().then(() => {
      this.createLecturerAttendanceChart(); // Create lecturer bar chart
    });

    this.fetchAttendedStudents().then(() => {
      this.createStudentAttendanceChart(); // Create student pie chart
    });
  }

  async fetchLecturers() {
    try {
      const lecturersSnapshot = await this.firestore.collection<Lecturer>('registered staff', ref => 
        ref.where('position', '==', 'lecturer')
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
      // Step 1: Fetch all registered students
      const studentsSnapshot = await this.firestore.collection('registeredStudents').get().toPromise();
      
      if (studentsSnapshot && !studentsSnapshot.empty) {
        this.students = studentsSnapshot.docs.map(doc => doc.data() as Student);
        this.studentCount = this.students.length;
  
        const attendedStudentNumbers: Set<string> = new Set(); // Use a Set to store unique attended student numbers
  
        // Step 2: Fetch attendance data for all modules from the 'Attended' collection
        const attendedModulesSnapshot = await this.firestore.collection('Attended').get().toPromise();
  
        // Ensure that attendedModulesSnapshot exists before proceeding
        if (attendedModulesSnapshot && !attendedModulesSnapshot.empty) {
          // Step 3: Loop through each module document in 'Attended' collection
          for (const moduleDoc of attendedModulesSnapshot.docs) {
            const attendedData = moduleDoc.data() as Record<string, any>;
            
            console.log('Attended Data:', attendedData);
            
            // Collect all attended students' numbers across all dates for each module
            for (const date in attendedData) {
              if (attendedData.hasOwnProperty(date)) {
                const studentsArray = attendedData[date];
  
                if (Array.isArray(studentsArray)) {
                  studentsArray.forEach(studentInfo => {
                    if (typeof studentInfo === 'object' && studentInfo.studentNumber) {
                      attendedStudentNumbers.add(studentInfo.studentNumber);
                    } else {
                      console.error(`Invalid student info for date ${date}:`, studentInfo);
                    }
                  });
                } else {
                  console.error(`Expected an array for date ${date}, but got:`, studentsArray);
                }
              }
            }
          }
  
          this.attendingStudents = Array.from(attendedStudentNumbers);
          this.nonAttendingCount = this.studentCount - this.attendingStudents.length;
  
          console.log('Total registered students:', this.studentCount);
          console.log('Total attended students:', this.attendingStudents.length);
          console.log('Total non-attending students:', this.nonAttendingCount);
        } else {
          console.error('No attendance data found in any modules.');
          this.attendingStudents = [];
          this.nonAttendingCount = this.studentCount;
        }
      } else {
        console.error('No registered students data found');
        this.studentCount = 0;
        this.nonAttendingCount = 0;
        this.attendingStudents = [];
      }
    } catch (error) {
      console.error('Error fetching attended students:', error);
    }
  }
  
  
  createStudentAttendanceChart() {
  const studentCanvas = <HTMLCanvasElement>document.getElementById('studentAttendanceChart');
  const studentCtx = studentCanvas?.getContext('2d');

  // Debugging: Log the data being used
  console.log("Attending Students:", this.attendingStudents);
  console.log("Non-Attending Count:", this.nonAttendingCount);

  if (studentCtx) {
    // Ensure the data is valid
    const attendingCount = this.attendingStudents.length;
    const nonAttendingCount = typeof this.nonAttendingCount === 'number' ? this.nonAttendingCount : 0; // Default to 0 if not a number

    new Chart(studentCtx, {
      type: 'pie',
      data: {
        labels: ['Attending', 'Not Attending'],
        datasets: [{
          data: [attendingCount, nonAttendingCount],
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

    // Destroy existing chart instance if it exists
    if (this.lecturerChart) {
      this.lecturerChart.destroy();
    }

    if (lecturerCtx) {
      // Create a new chart instance and store it
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
    } else {
      console.error('Failed to get the 2D context for lecturer attendance bar chart');
    }
  }
}
