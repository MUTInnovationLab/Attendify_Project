import { Component, AfterViewInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Router } from '@angular/router';
import { AngularFirestore, Query } from '@angular/fire/compat/firestore';
import { AuthService } from '../services/auth.service';
import { FacultyDepartmentService } from '../services/faculty-department.service';

Chart.register(...registerables);

// Updated User interface to better match UserData
interface User {
  uid?: string;
  email: string | null;
  role?: string;
  faculty?: string;
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
  faculties: string[] = ['All'];

  currentUser: User | null = null;
  isLoading: boolean = true;
  userFaculty: string = '';
  isSuperAdmin: boolean = false;

  constructor(private firestore: AngularFirestore, private router: Router, private authService: AuthService, private facultyService: FacultyDepartmentService) {}

  ngAfterViewInit() {
    this.loadFaculties();
    this.initializeUserData();
  }

  async fetchData() {
    await this.fetchLecturers();
    await this.fetchAttendedStudents();
    // Ensure that charts are created after Angular has updated the view
    setTimeout(() => {
      this.createCharts();
    }, 0);
  }

  navigateToDeptAnalysis() {
    this.router.navigate(['/dept-an']);
  }

  async initializeUserData() {
    try {
      const userData = await this.authService.getCurrentUser();
      if (userData) {
        console.log('User data received:', userData);
        this.currentUser = {
          uid: userData.uid,
          email: userData.email,
          role: userData.position,
          faculty: userData.faculty
        };
        
        const userPosition = userData.position?.trim();
        console.log('User position:', userPosition);
        
        this.isSuperAdmin = userPosition === 'super-admin';
        
        if (userPosition === 'Dean' && userData.faculty) {
          console.log('Dean detected for faculty:', userData.faculty);
          this.userFaculty = userData.faculty;
          this.selectedFaculty = userData.faculty;
          this.faculties = [userData.faculty];
        }
        
        await this.loadRoleSpecificData();
      } else {
        console.error('No user data found');
        this.router.navigate(['/login']);
      }
    } catch (error) {
      console.error('Error in initializeUserData:', error);
      this.router.navigate(['/login']);
    }
  }

  // Helper method to normalize role strings
  private normalizeRole(position?: string): string | undefined {
    if (position) {
      return position.toLowerCase();
    }
    return undefined;
  }

  private async loadFaculties() {
    try {
      this.facultyService.getFaculties().subscribe(
        (facultyNames) => {
          // Add 'All' option and combine with fetched faculties
          this.faculties = ['All', ...facultyNames];
          console.log('Loaded faculties:', this.faculties);
        },
        (error) => {
          console.error('Error loading faculties:', error);
        }
      );
    } catch (error) {
      console.error('Error in loadFaculties:', error);
    }
  }

  async loadRoleSpecificData() {
    try {
      console.log('Loading role specific data for:', this.currentUser?.role);
      if (this.currentUser) {
        const position = this.currentUser.role?.trim();
        
        if (position === 'Dean' && this.currentUser.faculty) {
          console.log('Fetching data for Dean of faculty:', this.currentUser.faculty);
          this.selectedFaculty = this.currentUser.faculty;
          // For Dean, only show their faculty
          this.faculties = [this.currentUser.faculty];
          await this.fetchData();
        } else if (position === 'super-admin') {
          console.log('Fetching data for super-admin');
          // Super admin will see all faculties loaded from loadFaculties()
          await this.fetchData();
        } else {
          console.error('Unknown position:', position);
        }
      }
      this.isLoading = false;
    } catch (error) {
      console.error('Error in loadRoleSpecificData:', error);
      this.isLoading = false;
    }
  }

  async fetchLecturers() {
    try {
      console.log('Fetching lecturers for faculty:', this.selectedFaculty);
      
      let query = this.firestore.collection<Lecturer>('staff')
        .ref.where('position', 'in', ['lecturer', 'Lecturer']) as Query<Lecturer>;

      // Add faculty filter for deans
      if (this.currentUser?.role === 'Dean' && this.currentUser.faculty) {
        query = query.where('faculty', '==', this.currentUser.faculty) as Query<Lecturer>;
      } else if (this.selectedFaculty !== 'All') {
        query = query.where('faculty', '==', this.selectedFaculty) as Query<Lecturer>;
      }

      const lecturersSnapshot = await query.get();
      console.log('Lecturers found:', lecturersSnapshot.size);
      
      if (!lecturersSnapshot.empty) {
        this.lecturers = lecturersSnapshot.docs.map(doc => doc.data() as Lecturer);
        this.updateLecturerCount();
      } else {
        console.log('No lecturers found for faculty:', this.selectedFaculty);
        this.lecturers = [];
        this.updateLecturerCount();
      }
    } catch (error) {
      console.error('Error fetching lecturers:', error);
      this.lecturers = [];
      this.updateLecturerCount();
    }
  }

  async fetchAttendedStudents() {
    try {
      let query = this.firestore.collection('students').ref as Query<Student>;

      // Add faculty filter for deans
      if (this.currentUser?.role === 'Dean' && this.currentUser.faculty) {
        query = query.where('faculty', '==', this.currentUser.faculty) as Query<Student>;
      } else if (this.selectedFaculty !== 'All') {
        query = query.where('faculty', '==', this.selectedFaculty) as Query<Student>;
      }

      const studentsSnapshot = await query.get();
      
      if (!studentsSnapshot.empty) {
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
          this.attendingStudents = [];
          this.updateNonAttendingCount();
        }
      } else {
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

  // Updated to compare using studentNumber instead of email
  updateNonAttendingCount() {
    const attendingCount = this.selectedFaculty === 'All' 
      ? this.attendingStudents.length 
      : this.attendingStudents.filter(studentNumber => 
          this.students.find(s => s.studentNumber === studentNumber && s.faculty === this.selectedFaculty)
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
            data: filteredLecturers.map(() => Math.random() * 10), // Replace with actual data if available
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { beginAtZero: true },
            y: { beginAtZero: true },
          },
        },
      });
    } else {
      console.error('Failed to get the 2D context for lecturer attendance bar chart');
    }
  }
  
  navigateBack(){
    this.router.navigate(['/dashboard']);
  }
}
