import { Component, OnInit } from '@angular/core';
import { StudentService } from '../services/student.service';
import { ModalController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

export interface Student {
  studentNumber: string;
  name: string;
  surname: string;
  email: string;
}

export interface EnrolledModule {
  Enrolled: Array<{
    status: string;
    studentNumber: string;
  }>;
}

@Component({
  selector: 'app-view-students',
  templateUrl: './view-students.page.html',
  styleUrls: ['./view-students.page.scss']
})
export class ViewStudentsPage implements OnInit {
  students: Student[] = [];
  filteredStudents: Student[] = [];
  selectedStudent: Student | null = null;
  studentModules: string[] = [];
  searchTerm: string = '';
  currentPage: number = 1;
  pageSize: number = 9;
  totalPages: number = 1;

  constructor(
    private toastController: ToastController,
    private studentService: StudentService,
    private modalController: ModalController,
    private firestore: AngularFirestore,
    private router: Router
  ) {}

  ngOnInit() {
    this.fetchStudents();
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      color: color,
      duration: 2000
    });
    toast.present();
  }

  fetchStudents() {
    console.log('Fetching students...');
    
    this.firestore.collection<Student>('registeredStudents').valueChanges()
      .subscribe(
        (students: Student[]) => {
          console.log('Fetched students:', students);
          this.students = students;
          this.filteredStudents = students;
          this.updatePagination();
        },
        error => {
          console.error('Error fetching students:', error);
        }
      );
  }

  clearSelection() {
    this.selectedStudent = null;
  }

  async fetchModulesForStudent(studentNumber: string): Promise<string[]> {
    const modules: string[] = [];
    
    try {
      const querySnapshot = await this.firestore.collection('enrolledModules').get().toPromise();
      
      if (querySnapshot) {
        querySnapshot.forEach(doc => {
          const moduleData = doc.data() as EnrolledModule;
          
          // Check if Enrolled array exists and is an array
          if (Array.isArray(moduleData.Enrolled)) {
            const isEnrolled = moduleData.Enrolled.some(entry => 
              entry && typeof entry === 'object' &&
              entry.studentNumber === studentNumber && 
              entry.status === 'Enrolled'
            );
            
            if (isEnrolled) {
              modules.push(doc.id); // doc.id is the module code
            }
          } else {
            console.warn(`Document ${doc.id} does not have a valid Enrolled array`);
          }
        });
      }
      
      console.log('Modules for student:', modules);
      return modules;
    } catch (error) {
      console.error('Error fetching modules for student:', error);
      return [];
    }
  }

  async onStudentClick(student: Student) {
    console.log('Clicked student object:', JSON.stringify(student, null, 2));
    this.selectedStudent = student;

    if (student && student.studentNumber) {
      console.log('Fetching modules for student number:', student.studentNumber);
      try {
        const modules = await this.fetchModulesForStudent(student.studentNumber);
        this.studentModules = modules;
        console.log('Fetched modules:', modules);
      } catch (error) {
        console.error('Error fetching modules:', error);
        this.presentToast('Error: Unable to fetch modules', 'danger');
      }
    } else {
      console.error('Invalid student object or missing student number');
      this.presentToast('Error: Invalid student data', 'danger');
    }
  }

  goBack() {
    this.router.navigate(['/lecture']);
  }

  dismiss() {
    this.router.navigate(['/lecture']);
  }

  filterStudents() {
    if (this.searchTerm.trim() === '') {
      this.filteredStudents = this.students;
    } else {
      this.filteredStudents = this.students.filter(student =>
        student.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        student.studentNumber.includes(this.searchTerm.toLowerCase())
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredStudents.length / this.pageSize);
  }

  getPaginatedStudents(): Student[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredStudents.slice(startIndex, endIndex);
  }

  changePage(newPage: number) {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
    }
  }

  nextPage() {
    this.changePage(this.currentPage + 1);
  }

  previousPage() {
    this.changePage(this.currentPage - 1);
  }
}