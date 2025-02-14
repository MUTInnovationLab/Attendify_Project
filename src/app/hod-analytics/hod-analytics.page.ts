import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
export class HodAnalyticsPage implements AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly CHART_COLORS = {
    attending: {
      background: 'rgba(75, 192, 192, 0.7)',
      border: 'rgba(75, 192, 192, 1)'
    },
    notAttending: {
      background: 'rgba(255, 99, 132, 0.7)',
      border: 'rgba(255, 99, 132, 1)'
    }
  };

  lecturers: Lecturer[] = [];
  students: Student[] = [];
  attendingStudents = new Set<string>();
  studentCount = 0;
  lecturerCount = 0;
  nonAttendingCount = 0;
  departmentName = '';
  
  private lecturerChart?: Chart;
  private studentChart?: Chart;
  private currentHOD: HOD | null = null;

  constructor(
    private firestore: AngularFirestore,
    private router: Router,
    private authService: AuthService
  ) {}

  ngAfterViewInit(): void {
    this.initializeHOD();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  private async initializeHOD(): Promise<void> {
    try {
      const userEmail = await this.authService.getCurrentUserEmail();
      if (!userEmail) {
        this.router.navigate(['/login']);
        return;
      }

      const hodSnapshot = await this.firestore
        .collection<HOD>('staff')
        .ref.where('email', '==', userEmail)
        .get();

      if (hodSnapshot.empty) {
        this.router.navigate(['/unauthorized']);
        return;
      }

      this.currentHOD = hodSnapshot.docs[0].data() as HOD;
      this.departmentName = this.currentHOD.department;
      await this.fetchDepartmentData();
    } catch (error) {
      console.error('Failed to initialize HOD:', error);
      // Consider adding user feedback here
    }
  }

  private async fetchDepartmentData(): Promise<void> {
    await Promise.all([
      this.fetchLecturers(),
      this.fetchStudentsAndAttendance()
    ]);
    this.createCharts();
  }

  private async fetchLecturers(): Promise<void> {
    try {
      const snapshot = await this.firestore.collection<Lecturer>('staff', ref =>
        ref.where('position', 'in', ['lecturer', 'Lecturer'])
           .where('department', '==', this.currentHOD?.department)
      ).get().toPromise();

      if (snapshot) {
        this.lecturers = snapshot.docs.map(doc => doc.data() as Lecturer);
        this.lecturerCount = this.lecturers.length;
      }
    } catch (error) {
      console.error('Failed to fetch lecturers:', error);
    }
  }

  private async fetchStudentsAndAttendance(): Promise<void> {
    try {
      // Fetch students
      const studentsSnapshot = await this.firestore
        .collection<Student>('students')
        .ref.where('department', '==', this.currentHOD?.department)
        .get();

      this.students = studentsSnapshot.docs.map(doc => doc.data() as Student);
      this.studentCount = this.students.length;

      // Fetch attendance
      const attendanceSnapshot = await this.firestore
        .collection('Attended')
        .get()
        .toPromise();

      if (attendanceSnapshot) {
        this.processAttendanceData(attendanceSnapshot.docs);
      }
    } catch (error) {
      console.error('Failed to fetch students and attendance:', error);
    }
  }

  private processAttendanceData(attendanceDocs: any[]): void {
    this.attendingStudents.clear();
    
    for (const doc of attendanceDocs) {
      const attendanceData = doc.data();
      
      Object.values(attendanceData).forEach(dateAttendance => {
        if (Array.isArray(dateAttendance)) {
          dateAttendance.forEach((student: any) => {
            if (student?.studentNumber) {
              const isInDepartment = this.students.some(
                s => s.studentNumber === student.studentNumber
              );
              if (isInDepartment) {
                this.attendingStudents.add(student.studentNumber);
              }
            }
          });
        }
      });
    }

    this.nonAttendingCount = this.studentCount - this.attendingStudents.size;
  }

  private createCharts(): void {
    this.createStudentAttendanceChart();
    this.createLecturerAttendanceChart();
  }

  private createStudentAttendanceChart(): void {
    const ctx = document.getElementById('studentAttendanceChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.studentChart?.destroy();

    const attendingCount = this.attendingStudents.size;
    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: ['Attending', 'Not Attending'],
        datasets: [{
          data: [attendingCount, this.nonAttendingCount],
          backgroundColor: [
            this.CHART_COLORS.attending.background,
            this.CHART_COLORS.notAttending.background
          ],
          borderColor: [
            this.CHART_COLORS.attending.border,
            this.CHART_COLORS.notAttending.border
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const value = context.raw;
                const total = attendingCount + this.nonAttendingCount;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    this.studentChart = new Chart(ctx, config);
  }

  private createLecturerAttendanceChart(): void {
    const ctx = document.getElementById('lecturerAttendanceChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.lecturerChart?.destroy();

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: this.lecturers.map(lecturer => lecturer.fullName),
        datasets: [{
          label: 'Classes Conducted',
          data: this.lecturers.map(() => Math.floor(Math.random() * 20) + 10), // Replace with actual data
          backgroundColor: this.CHART_COLORS.attending.background,
          borderColor: this.CHART_COLORS.attending.border,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Classes'
            }
          }
        }
      }
    };

    this.lecturerChart = new Chart(ctx, config);
  }

  private destroyCharts(): void {
    this.studentChart?.destroy();
    this.lecturerChart?.destroy();
  }

  navigateToDeptAnalysis(): void {
    this.router.navigate(['/dept-an']);
  }
}