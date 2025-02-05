import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { getFirestore } from 'firebase/firestore';
import { DataService } from '../services/data.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';


interface Module {
  moduleCode: string;
  moduleName: string;
  department: string;
}

interface AssignedLecturesData {
  userEmail: string;
  modules: Module[];
}

interface Lecturer {
  staffNumber: string;
  name: string;
  surname: string;
  email: string;
  department: string;
  position: string;
  modules?: Module[];
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
  presentToast: any;
  selectedSegment: string = 'lecturers';
  hodDepartment: string = '';
  userEmail: string = '';

  constructor(
    private firestore: AngularFirestore,
    private toastController: ToastController,
    private router: Router,
    private afAuth: AngularFireAuth
  ) {}

  async ngOnInit() {
    const db = getFirestore();
    await this.getCurrentUser();
    await this.getHodDepartment();
    this.loadLecturers();
    this.loadStudents();
  }

  private async getCurrentUser() {
    const user = await this.afAuth.currentUser;
    if (user) {
      this.userEmail = user.email || '';
    }
  }

  private async getHodDepartment() {
    const staffSnapshot = await this.firestore.collection('staff', ref => 
      ref.where('email', '==', this.userEmail)
         .where('position', '==', 'HOD')
    ).get().toPromise();

    if (staffSnapshot && !staffSnapshot.empty) {
      this.hodDepartment = (staffSnapshot.docs[0].data() as any)['department'];
    }
  }

  private loadDataWithDelay(data: any[], page: number, pageSize: number, callback: (data: any[]) => void) {
    setTimeout(() => {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      callback(data.slice(startIndex, endIndex));
    }, 500);
  }

  loadLecturers() {
    this.firestore.collection('staff', ref => 
      ref.where('department', '==', this.hodDepartment)
         .where('position', '==', 'lecturer')
    ).snapshotChanges().subscribe(async (lecturerDocs) => {
      this.lecturers = [];
      
      for (const lecturerDoc of lecturerDocs) {
        const lecturer = lecturerDoc.payload.doc.data() as Lecturer;
        
        try {
          const assignedModulesSnapshot = await this.firestore
            .collection('assignedLectures')
            .ref.where('userEmail', '==', lecturer.email)
            .get();
  
          let modules: Module[] = [];
          
          assignedModulesSnapshot.forEach(doc => {
            const assignedData = doc.data() as AssignedLecturesData;
            if (assignedData.modules && Array.isArray(assignedData.modules)) {
              const departmentModules = assignedData.modules.filter(module => 
                module.department === this.hodDepartment
              );
              modules = [...modules, ...departmentModules];
            }
          });
  
          if (modules.length > 0) {
            this.lecturers.push({
              ...lecturer,
              modules
            });
          }
        } catch (error) {
          console.error(`Error fetching modules for lecturer ${lecturer.email}:`, error);
        }
      }
  
      this.loadDataWithDelay(
        this.lecturers,
        this.currentLecturerPage,
        this.lecturersPageSize,
        (data) => {
          this.displayedLecturers = data;
        }
      );
    });
  }


  loadStudents() {
    this.firestore.collection('students', ref =>
      ref.where('department', '==', this.hodDepartment)
    ).valueChanges().subscribe((students: any[]) => {
      this.students = students.map(student => ({
        ...student,
        fullName: `${student.name} ${student.surname}`
      }));
      this.loadDataWithDelay(this.students, this.currentStudentPage, this.studentsPageSize, (data) => {
        this.displayedStudents = data;
      });
    });
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

  toggleView() {
    this.selectedSegment = this.selectedSegment === 'lecturers' ? 'students' : 'lecturers';
  }

  toggleStudentTable() {
    this.showStudents = !this.showStudents;
  }

  backToLecturerTable() {
    this.showStudents = false;
  }

  /*navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToDeptAnalysis() {
    this.router.navigate(['/admin']);
  }*/

  searchLecturers() {
    if (this.searchStaffNumber.trim() !== '') {
      this.currentLecturerPage = 1;

      this.firestore.collection('staff', ref => ref
        .where('department', '==', this.hodDepartment)
        .where('position', '==', 'lecturer')
        .where('staffNumber', '>=', this.searchStaffNumber)
        .where('staffNumber', '<=', this.searchStaffNumber + '\uf8ff')
      ).valueChanges().subscribe(async (lecturers: any[]) => {
        this.lecturers = [];
        
        for (const lecturer of lecturers) {
          const assignedModulesSnapshot = await this.firestore.collection('assignedLectures', ref =>
            ref.where('userEmail', '==', lecturer.email)
          ).get().toPromise();

          let modules: any[] = [];
          if (assignedModulesSnapshot) {
            assignedModulesSnapshot.docs.forEach(doc => {
              const data = doc.data();
              if ((data as any).modules) {
                modules = modules.concat((data as any).modules.filter((module: any) => 
                  module.department === this.hodDepartment
                ));
              }
            });
          }

          this.lecturers.push({
            ...lecturer,
            modules: modules
          });
        }

        this.loadDataWithDelay(this.lecturers, this.currentLecturerPage, this.lecturersPageSize, (data) => {
          this.displayedLecturers = data;
        });
      });
    } else {
      this.loadLecturers();
    }
  }

  searchStudents() {
    if (this.searchStudentNumber.trim() !== '') {
      this.firestore.collection('students', ref => ref
        .where('department', '==', this.hodDepartment)
        .where('studentNumber', '>=', this.searchStudentNumber)
        .where('studentNumber', '<=', this.searchStudentNumber + '\uf8ff')
      ).valueChanges().subscribe((students: any[]) => {
        this.students = students.map(student => ({
          ...student,
          fullName: `${student.name} ${student.surname}`
        }));

        this.loadDataWithDelay(this.students, this.currentStudentPage, this.studentsPageSize, (data) => {
          this.displayedStudents = data;
        });
      });
    } else {
      this.loadStudents();
    }
  }

  deleteLecturer(staffNumber: string) {
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
      });
  }

  deleteStudent(studentNumber: string) {
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
      });
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'top'
    });
    toast.present();
  }

  navigateBack(){
    this.router.navigate(['/admin']);
  }
}






