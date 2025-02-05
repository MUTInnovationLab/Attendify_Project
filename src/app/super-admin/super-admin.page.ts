import { Component, AfterViewInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';

Chart.register(...registerables);

interface AttendanceData {
  [date: string]: AttendanceRecord[];
}

interface FirestoreDoc {
  data(): any;
  exists: boolean;
}

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

interface AttendanceRecord {
  studentNumber: string;
  scanTime: string;
}

interface AssignedModule {
  department: string;
  faculty: string;
  moduleCode: string;
  moduleLevel: string;
  moduleName: string;
  scannerOpenCount: number;
  userEmail: string;
}

interface AssignedLectureDoc {
  modules: AssignedModule[];
}

@Component({
  selector: 'app-super-admin',
  templateUrl: './super-admin.page.html',
  styleUrls: ['./super-admin.page.scss'],
})
export class SuperAdminPage implements AfterViewInit {
  lecturers: Lecturer[] = [];
  students: Student[] = [];
  attendingStudents: Set<string> = new Set();
  studentCount: number = 0;
  lecturerCount: number = 0;
  nonAttendingCount: number = 0;
  attendingCount: number = 0;
  lecturerChart: any;
  studentChart: any;
  selectedFaculty: string = 'All';
  faculties: string[] = ['All'];
  availableDepartments: string[] = [];
  assignedLectureIds = ['22446688', '33557799', '987001'];
  lecturerModules: Map<string, AssignedModule[]> = new Map();
  lecturerAttendanceRates: Map<string, number> = new Map();
  isLoading: boolean = true;

  constructor(private firestore: AngularFirestore, private router: Router) {}

  ngAfterViewInit() {
    this.loadFaculties();
    this.fetchData();
  }

  async loadFaculties() {
    try {
      const facultiesSnapshot = await this.firestore.collection('faculties').get().toPromise();
      if (facultiesSnapshot) {
        this.faculties = ['All', ...facultiesSnapshot.docs.map(doc => doc.id)];
      }
    } catch (error) {
      console.error('Error loading faculties:', error);
    }
  }

  async fetchData() {
    this.isLoading = true;
    try {
      await Promise.all([
        this.fetchLecturers(),
        this.fetchAssignedLectures(),
        this.fetchStudentsAndAttendance()
      ]);
      await this.calculateLecturerAttendanceRates();
      this.createCharts();
    } finally {
      this.isLoading = false;
    }
  }

  async fetchAssignedLectures() {
    try {
      for (const lectureId of this.assignedLectureIds) {
        const lectureDoc = await this.firestore.collection('assignedLectures').doc(lectureId).get().toPromise();
        if (lectureDoc?.exists) {
          const data = lectureDoc.data() as AssignedLectureDoc;
          if (data && Array.isArray(data.modules)) {
            for (const module of data.modules) {
              const existingModules = this.lecturerModules.get(module.userEmail) || [];
              existingModules.push(module);
              this.lecturerModules.set(module.userEmail, existingModules);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching assigned lectures:', error);
    }
  }

  async fetchLecturers() {
    try {
      const lecturersSnapshot = await this.firestore.collection<Lecturer>('staff', ref =>
        ref.where('position', 'in', ['lecturer', 'Lecturer'])
      ).get().toPromise();

      if (lecturersSnapshot) {
        this.lecturers = lecturersSnapshot.docs.map(doc => doc.data() as Lecturer);
        this.updateLecturerCount();
      }
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    }
  }

  async fetchStudentsAndAttendance() {
    try {
      const studentsSnapshot = await this.firestore.collection('students').get().toPromise();
      if (studentsSnapshot) {
        this.students = studentsSnapshot.docs.map(doc => doc.data() as Student);
        this.updateStudentCount();
      }

      this.attendingStudents.clear();

      // Fetch attendance for each lecturer's modules
      for (const [lecturerEmail, modules] of this.lecturerModules.entries()) {
        for (const module of modules) {
          try {
            const moduleDoc = await this.firestore.collection('Attended').doc(module.moduleCode).get().toPromise();
            if (moduleDoc?.exists) {
              const moduleData = moduleDoc.data() as AttendanceData;
              if (moduleData) {
                Object.entries(moduleData).forEach(([date, dailyAttendance]) => {
                  if (Array.isArray(dailyAttendance)) {
                    dailyAttendance.forEach((record: AttendanceRecord) => {
                      if (record.studentNumber) {
                        this.attendingStudents.add(record.studentNumber);
                      }
                    });
                  }
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching attendance for module ${module.moduleCode}:`, error);
          }
        }
      }

      this.updateAttendanceCounts();
    } catch (error) {
      console.error('Error fetching students and attendance:', error);
    }
  }

  async calculateLecturerAttendanceRates() {
    for (const [lecturerEmail, modules] of this.lecturerModules.entries()) {
      let totalScannerCount = 0;
      let totalAttendance = 0;

      for (const module of modules) {
        totalScannerCount += module.scannerOpenCount || 0;
        try {
          const moduleDoc = await this.firestore.collection('Attended').doc(module.moduleCode).get().toPromise();
          if (moduleDoc?.exists) {
            const moduleData = moduleDoc.data() as AttendanceData;
            if (moduleData) {
              const daysWithAttendance = Object.keys(moduleData).length;
              totalAttendance += daysWithAttendance;
            }
          }
        } catch (error) {
          console.error(`Error calculating attendance for module ${module.moduleCode}:`, error);
        }
      }

      const attendanceRate = totalScannerCount > 0 
        ? (totalAttendance / totalScannerCount) * 100 
        : 0;
      this.lecturerAttendanceRates.set(lecturerEmail, attendanceRate);
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

  updateAttendanceCounts() {
    const relevantStudents = this.selectedFaculty === 'All' 
      ? this.students 
      : this.students.filter(s => s.faculty === this.selectedFaculty);

    this.attendingCount = relevantStudents.filter(student => 
      this.attendingStudents.has(student.studentNumber)
    ).length;

    this.nonAttendingCount = relevantStudents.length - this.attendingCount;
  }

  createStudentAttendanceChart() {
    const studentCanvas = <HTMLCanvasElement>document.getElementById('studentAttendanceChart');
    const studentCtx = studentCanvas?.getContext('2d');

    if (studentCtx) {
      if (this.studentChart) {
        this.studentChart.destroy();
      }

      this.studentChart = new Chart(studentCtx, {
        type: 'pie',
        data: {
          labels: ['Attending', 'Not Attending'],
          datasets: [{
            data: [this.attendingCount, this.nonAttendingCount],
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
                  return `${tooltipItem.label}: ${dataValue} students (${percentage}%)`;
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

      const filteredLecturers = this.selectedFaculty === 'All' 
        ? this.lecturers 
        : this.lecturers.filter(l => l.faculty === this.selectedFaculty);

      const labels = [];
      const data = [];

      for (const lecturer of filteredLecturers) {
        const attendanceRate = this.lecturerAttendanceRates.get(lecturer.email) || 0;
        labels.push(lecturer.fullName);
        data.push(attendanceRate);
      }

      this.lecturerChart = new Chart(lecturerCtx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Lecturer Attendance Rate (%)',
            data: data,
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'Attendance Rate (%)'
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
            }
          }
        },
      });
    }
  }

  createCharts() {
    this.createStudentAttendanceChart();
    this.createLecturerAttendanceChart();
  }

  async onFacultyChange() {
    try {
      if (this.selectedFaculty && this.selectedFaculty !== 'All') {
        const facultyDoc = await this.firestore.collection('faculties').doc(this.selectedFaculty).get().toPromise();
        const departments = (facultyDoc?.data() as any)?.departments || [];
        this.availableDepartments = departments.map((dept: any) => dept.name);
      } else {
        this.availableDepartments = [];
      }
      this.updateStudentCount();
      this.updateAttendanceCounts();
      this.createCharts();
    } catch (error) {
      console.error('Error handling faculty change:', error);
    }
  }

  navigateBack() {
    this.router.navigate(['/dashboard']);
  }
}