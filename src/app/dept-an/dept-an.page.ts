import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';

interface User {
  email: string | null;
  role: string;
  department?: string;
  faculty?: string;
}

@Component({
  selector: 'app-dept-an',
  templateUrl: './dept-an.page.html',
  styleUrls: ['./dept-an.page.scss'],
})
export class DeptAnPage implements OnInit {
  lecturers: any[] = [];
  students: any[] = [];
  displayedLecturers: any[] = [];
  displayedStudents: any[] = [];
  departments: string[] = [];
  currentLecturerPage = 1;
  currentStudentPage = 1;
  lecturersPageSize = 6;
  studentsPageSize = 6;
  editingLecturerStaffNumber: string | null = null;
  editingStudentNumber: string | null = null;
  showStudents: boolean = false;
  showLecturerSearchCard: boolean = true;
  showStudentSearchCard: boolean = true;
  searchStaffNumber: string = '';
  searchStudentNumber: string = '';
  selectedSegment: string = 'lecturers';
  
  currentUser: User | null = null;
  userRole: string = 'user';

  constructor(
    private firestore: AngularFirestore,
    private toastController: ToastController,
    private router: Router,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    try {
      const userData = await this.authService.getCurrentUser();
      if (!userData) {
        await this.showToast('User not found');
        this.router.navigate(['/login']);
        return;
      }

      this.currentUser = {
        email: userData.email,
        role: userData.role || 'user',
        department: userData.department,
        faculty: userData.faculty
      };
      
      this.userRole = this.currentUser.role.toLowerCase();

      if (this.userRole === 'dean' && this.currentUser.faculty) {
        this.departments = await this.authService.getDepartmentsForFaculty(this.currentUser.faculty);
      }

      await this.loadInitialData();
    } catch (error) {
      console.error('Error initializing page:', error);
      await this.showToast('Error loading user data');
      this.router.navigate(['/login']);
    }
  }

  private getQueryForRole(collection: string): any {
    if (!this.currentUser) {
      return this.firestore.collection(collection);
    }

    switch (this.userRole) {
      case 'dean':
        return this.currentUser.faculty ? 
          this.firestore.collection(collection, ref =>
            ref.where('faculty', '==', this.currentUser!.faculty)
          ) : 
          this.firestore.collection(collection);

      case 'hod':
        return this.currentUser.department ? 
          this.firestore.collection(collection, ref =>
            ref.where('department', '==', this.currentUser!.department)
          ) : 
          this.firestore.collection(collection);

      case 'super-admin':
      default:
        return this.firestore.collection(collection);
    }
  }

  private loadDataWithDelay(data: any[], page: number, pageSize: number, callback: (data: any[]) => void) {
    setTimeout(() => {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      callback(data.slice(startIndex, endIndex));
    }, 500);
  }

  private updateDisplayedLecturers() {
    const startIndex = (this.currentLecturerPage - 1) * this.lecturersPageSize;
    const endIndex = startIndex + this.lecturersPageSize;
    this.displayedLecturers = this.lecturers.slice(startIndex, endIndex);
  }

  private updateDisplayedStudents() {
    const startIndex = (this.currentStudentPage - 1) * this.studentsPageSize;
    const endIndex = startIndex + this.studentsPageSize;
    this.displayedStudents = this.students.slice(startIndex, endIndex);
  }

  private async loadLecturers() {
    if (!this.currentUser) return;

    try {
      let staffObservable: Observable<any[]> | undefined;

      switch (this.userRole) {
        case 'dean':
          if (this.currentUser.faculty) {
            staffObservable = this.authService.getStaffByFaculty(this.currentUser.faculty);
          }
          break;

        case 'hod':
          if (this.currentUser.department) {
            staffObservable = this.authService.getStaffByDepartment(this.currentUser.department);
          }
          break;

        case 'super-admin':
          staffObservable = this.firestore.collection('staff').valueChanges();
          break;
      }

      if (staffObservable) {
        staffObservable.subscribe({
          next: (staff: any[]) => {
            this.lecturers = staff.filter(member => 
              member['position']?.toLowerCase() === 'lecturer'
            );
            this.updateDisplayedLecturers();
          },
          error: async (error) => {
            console.error('Error loading lecturers:', error);
            await this.showToast('Error loading lecturer data');
          }
        });
      }
    } catch (error) {
      console.error('Error in loadLecturers:', error);
      await this.showToast('Error loading lecturer data');
    }
  }

  private async loadStudents() {
    if (!this.currentUser) return;

    try {
      let studentsObservable: Observable<any[]> | undefined;

      switch (this.userRole) {
        case 'dean':
          if (this.currentUser.faculty) {
            studentsObservable = this.authService.getStudentsByFaculty(this.currentUser.faculty);
          }
          break;

        case 'hod':
          if (this.currentUser.department) {
            studentsObservable = this.authService.getStudentsByDepartment(this.currentUser.department);
          }
          break;

        case 'super-admin':
          studentsObservable = this.firestore.collection('students').valueChanges();
          break;
      }

      if (studentsObservable) {
        studentsObservable.subscribe({
          next: (students: any[]) => {
            this.students = students.map(student => ({
              ...student,
              fullName: `${student['name']} ${student['surname']}`
            }));
            this.updateDisplayedStudents();
          },
          error: async (error) => {
            console.error('Error loading students:', error);
            await this.showToast('Error loading student data');
          }
        });
      }
    } catch (error) {
      console.error('Error in loadStudents:', error);
      await this.showToast('Error loading student data');
    }
  }

  nextLecturerPage() {
    if (this.currentLecturerPage * this.lecturersPageSize < this.lecturers.length) {
      this.currentLecturerPage++;
      this.loadDataWithDelay(this.lecturers, this.currentLecturerPage, this.lecturersPageSize, (data) => {
        this.displayedLecturers = data;
      });
    }
  }

  prevLecturerPage() {
    if (this.currentLecturerPage > 1) {
      this.currentLecturerPage--;
      this.loadDataWithDelay(this.lecturers, this.currentLecturerPage, this.lecturersPageSize, (data) => {
        this.displayedLecturers = data;
      });
    }
  }

  nextStudentPage() {
    if (this.currentStudentPage * this.studentsPageSize < this.students.length) {
      this.currentStudentPage++;
      this.loadDataWithDelay(this.students, this.currentStudentPage, this.studentsPageSize, (data) => {
        this.displayedStudents = data;
      });
    }
  }

  prevStudentPage() {
    if (this.currentStudentPage > 1) {
      this.currentStudentPage--;
      this.loadDataWithDelay(this.students, this.currentStudentPage, this.studentsPageSize, (data) => {
        this.displayedStudents = data;
      });
    }
  }

  async searchLecturers() {
    if (!this.currentUser) {
      await this.showToast('User not authenticated');
      return;
    }

    if (this.searchStaffNumber.trim() === '') {
      await this.loadLecturers();
      return;
    }

    try {
      const baseQuery = this.firestore.collection('staff', ref => {
        let query = ref
          .where('staffNumber', '>=', this.searchStaffNumber)
          .where('staffNumber', '<=', this.searchStaffNumber + '\uf8ff');

        if (this.userRole === 'dean' && this.currentUser?.faculty) {
          query = query.where('faculty', '==', this.currentUser.faculty);
        } else if (this.userRole === 'hod' && this.currentUser?.department) {
          query = query.where('department', '==', this.currentUser.department);
        }

        return query;
      });

      baseQuery.valueChanges().subscribe({
        next: (staff: any[]) => {
          this.lecturers = staff.filter(staffMember => 
            staffMember['position'] === 'lecturer'
          );
          this.loadDataWithDelay(this.lecturers, this.currentLecturerPage, this.lecturersPageSize, (data) => {
            this.displayedLecturers = data;
          });
        },
        error: async (error: any) => {
          console.error('Error searching lecturers:', error);
          await this.showToast('Error searching lecturers');
        }
      });
    } catch (error) {
      console.error('Error in searchLecturers:', error);
      await this.showToast('Error searching lecturers');
    }
  }

  async searchStudents() {
    if (!this.currentUser) {
      await this.showToast('User not authenticated');
      return;
    }

    if (this.searchStudentNumber.trim() === '') {
      await this.loadStudents();
      return;
    }

    try {
      const baseQuery = this.firestore.collection('students', ref => {
        let query = ref
          .where('studentNumber', '>=', this.searchStudentNumber)
          .where('studentNumber', '<=', this.searchStudentNumber + '\uf8ff');

        if (this.userRole === 'dean' && this.currentUser?.faculty) {
          query = query.where('faculty', '==', this.currentUser.faculty);
        } else if (this.userRole === 'hod' && this.currentUser?.department) {
          query = query.where('department', '==', this.currentUser.department);
        }

        return query;
      });

      baseQuery.valueChanges().subscribe({
        next: (students: any[]) => {
          this.students = students.map(student => ({
            ...student,
            fullName: `${student['name']} ${student['surname']}`
          }));
          this.loadDataWithDelay(this.students, this.currentStudentPage, this.studentsPageSize, (data) => {
            this.displayedStudents = data;
          });
        },
        error: async (error: any) => {
          console.error('Error searching students:', error);
          await this.showToast('Error searching students');
        }
      });
    } catch (error) {
      console.error('Error in searchStudents:', error);
      await this.showToast('Error searching students');
    }
  }

  toggleView() {
    this.selectedSegment = this.selectedSegment === 'lecturers' ? 'students' : 'lecturers';
  }

  toggleStudentTable() {
    this.showStudents = !this.showStudents;
  }

  backToLecturerTable() {
    this.showStudents = false;
  }

  navigateToLogin() {
    if (this.userRole === 'hod') {
      this.router.navigate(['/admin']);
    } else {
      // For super-admin and dean
      this.router.navigate(['/dashboard']);
    }
  }

  navigateToDeptAnalysis() {
    switch (this.userRole) {
      case 'hod':
        this.router.navigate(['/hod-analytics']);
        break;
      case 'dean':
      case 'super-admin':
        this.router.navigate(['/dept-analytics']);
        break;
      default:
        // Handle any unexpected roles
        console.warn('Unexpected user role:', this.userRole);
        this.router.navigate(['/dashboard']);
        break;
    }
  }

  updateLecturer(lecturer: any) {
    if (!this.canModify()) {
      this.showToast('You do not have permission to modify records');
      return;
    }

    this.firestore.collection('/staff/').doc(lecturer['staffNumber']).update({
      fullName: lecturer['fullName'],
      email: lecturer['email'],
      position: lecturer['position'],
      department: lecturer['department']
    }).then(() => {
      this.showToast('Lecturer updated successfully');
      this.editingLecturerStaffNumber = null;
    });
  }

  deleteLecturer(staffNumber: string) {
    if (!this.canDelete()) {
      this.showToast('You do not have permission to delete records');
      return;
    }

    this.firestore.collection('staff')
      .ref.where('staffNumber', '==', staffNumber)
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          doc.ref.delete();
        });
        this.showToast('Lecturer successfully deleted!');
      })
      .catch(error => {
        console.error("Error deleting lecturer: ", error);
        this.showToast('Error deleting lecturer');
      });
  }

  updateStudent(student: any) {
    if (!this.canModify()) {
      this.showToast('You do not have permission to modify records');
      return;
    }

    this.firestore.collection('/students/').doc(student['studentNumber']).update({
      name: student['name'],
      email: student['email'],
      surname: student['surname']
    }).then(() => {
      this.showToast('Student updated successfully');
      this.editingStudentNumber = null;
    });
  }

  deleteStudent(studentNumber: string) {
    if (!this.canDelete()) {
      this.showToast('You do not have permission to delete records');
      return;
    }

    this.firestore.collection('students')
      .ref.where('studentNumber', '==', studentNumber)
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          doc.ref.delete();
        });
        this.showToast('Student successfully deleted!');
      })
      .catch(error => {
        console.error("Error deleting student: ", error);
        this.showToast('Error deleting student');
      });
  }

  canDelete(): boolean {
    return this.userRole === 'super-admin';
  }

  canModify(): boolean {
    return ['super-admin', 'dean', 'hod'].includes(this.userRole);
  }

  private async loadInitialData(): Promise<void> {
    await Promise.all([
      this.loadLecturers(),
      this.loadStudents()
    ]);
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'top'
    });
    await toast.present();
  }
}
