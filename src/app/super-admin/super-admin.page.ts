import { Component, AfterViewInit } from '@angular/core';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { firstValueFrom } from 'rxjs';

Chart.register(...registerables);

interface AttendanceData {
  [date: string]: AttendanceRecord[];
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

interface FacultyData {
  departments: Array<{ name: string }>;
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
  lecturerChart: Chart | null = null;
  studentChart: Chart | null = null;
  selectedFaculty: string = 'All';
  faculties: string[] = ['All'];
  availableDepartments: string[] = [];
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
      const facultiesSnapshot = await firstValueFrom(this.firestore.collection('faculties').get());
      this.faculties = ['All', ...facultiesSnapshot.docs.map(doc => doc.id)];
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
      const assignedLecturesSnapshot = await firstValueFrom(
        this.firestore.collection('assignedLectures').get()
      );

      for (const doc of assignedLecturesSnapshot.docs) {
        const data = doc.data() as AssignedLectureDoc;
        if (data && Array.isArray(data.modules)) {
          for (const module of data.modules) {
            const existingModules = this.lecturerModules.get(module.userEmail) || [];
            existingModules.push(module);
            this.lecturerModules.set(module.userEmail, existingModules);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching assigned lectures:', error);
    }
  }

  async fetchLecturers() {
    try {
      const lecturersSnapshot = await firstValueFrom(
        this.firestore.collection<Lecturer>('staff', ref =>
          ref.where('position', 'in', ['lecturer', 'Lecturer'])
        ).get()
      );

      this.lecturers = lecturersSnapshot.docs.map(doc => doc.data() as Lecturer);
      this.updateLecturerCount();
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    }
  }

  async fetchStudentsAndAttendance() {
    try {
      const studentsSnapshot = await firstValueFrom(
        this.firestore.collection('students').get()
      );
      
      this.students = studentsSnapshot.docs.map(doc => doc.data() as Student);
      this.updateStudentCount();

      this.attendingStudents.clear();

      // Fetch attendance for each lecturer's modules
      const attendancePromises: Promise<void>[] = [];

      for (const [, modules] of this.lecturerModules.entries()) {
        for (const module of modules) {
          attendancePromises.push(this.fetchModuleAttendance(module));
        }
      }

      await Promise.all(attendancePromises);
      this.updateAttendanceCounts();
    } catch (error) {
      console.error('Error fetching students and attendance:', error);
    }
  }

  private async fetchModuleAttendance(module: AssignedModule): Promise<void> {
    try {
      const moduleDoc = await firstValueFrom(
        this.firestore.collection('Attended').doc(module.moduleCode).get()
      );

      if (moduleDoc.exists) {
        const moduleData = moduleDoc.data() as AttendanceData;
        if (moduleData) {
          Object.values(moduleData).forEach(dailyAttendance => {
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

  async calculateLecturerAttendanceRates() {
    const attendancePromises: Promise<void>[] = [];

    for (const [lecturerEmail, modules] of this.lecturerModules.entries()) {
      attendancePromises.push(this.calculateLecturerRate(lecturerEmail, modules));
    }

    await Promise.all(attendancePromises);
  }

  private async calculateLecturerRate(lecturerEmail: string, modules: AssignedModule[]): Promise<void> {
    let totalScannerCount = 0;
    let totalAttendance = 0;

    for (const module of modules) {
      totalScannerCount += module.scannerOpenCount || 0;
      try {
        const moduleDoc = await firstValueFrom(
          this.firestore.collection('Attended').doc(module.moduleCode).get()
        );
        
        if (moduleDoc.exists) {
          const moduleData = moduleDoc.data() as AttendanceData;
          if (moduleData) {
            totalAttendance += Object.keys(moduleData).length;
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
    const studentCanvas = document.getElementById('studentAttendanceChart') as HTMLCanvasElement;
    const studentCtx = studentCanvas?.getContext('2d');

    if (studentCtx) {
      if (this.studentChart) {
        this.studentChart.destroy();
      }

      const config: ChartConfiguration = {
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
                label: (tooltipItem) => {
                  const dataset = tooltipItem.dataset;
                  const dataIndex = tooltipItem.dataIndex;
                  const dataValue = dataset.data[dataIndex];
                  const total = (dataset.data as number[]).reduce((sum, value) => sum + value, 0);
                  const percentage = ((dataValue as number / total) * 100).toFixed(2);
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
      };

      this.studentChart = new Chart(studentCtx, config);
    }
  }

  createLecturerAttendanceChart() {
    const lecturerCanvas = document.getElementById('lecturerAttendanceChart') as HTMLCanvasElement;
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
        const facultyDoc = await firstValueFrom(
          this.firestore.collection('faculties').doc(this.selectedFaculty).get()
        );
        const data = facultyDoc.data() as FacultyData;
        this.availableDepartments = data?.departments?.map(dept => dept.name) || [];
      } else {
        this.availableDepartments = [];
      }
      
      this.updateLecturerCount();
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