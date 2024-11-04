import { Component, OnInit } from '@angular/core';
import { StudentService } from '../services/student.service';
import { ModalController, ToastController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router, ActivatedRoute } from '@angular/router';

export interface Student {
  department: string;
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
  moduleCode: string;
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
  moduleCode: string = '';
  enrolledStudentNumbers: Set<string> = new Set();

  constructor(
    private toastController: ToastController,
    private studentService: StudentService,
    private modalController: ModalController,
    private firestore: AngularFirestore,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.moduleCode = params['moduleCode'];
      if (this.moduleCode) {
        this.fetchEnrolledStudents();
      } else {
        this.presentToast('No module selected', 'warning');
        this.router.navigate(['/lecture']);
      }
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      color: color,
      duration: 2000,
      position: 'top'
    });
    toast.present();
  }

  async fetchEnrolledStudents() {
    try {
      // First get the enrolled student numbers for the selected module
      const moduleDoc = await this.firestore
        .collection('enrolledModules')
        .doc(this.moduleCode)
        .get()
        .toPromise();

      if (moduleDoc?.exists) {
        const moduleData = moduleDoc.data() as EnrolledModule;
        
        // Get all enrolled student numbers
        this.enrolledStudentNumbers = new Set(
          moduleData.Enrolled
            .filter(entry => entry.status === 'Enrolled')
            .map(entry => entry.studentNumber)
        );

        // Now fetch the student details for these student numbers
        const studentPromises = Array.from(this.enrolledStudentNumbers).map(studentNumber =>
          this.firestore
            .collection('students')
            .ref.where('studentNumber', '==', studentNumber)
            .get()
        );

        const studentSnapshots = await Promise.all(studentPromises);
        
        this.students = studentSnapshots
          .flatMap(snapshot => snapshot.docs)
          .map(doc => doc.data() as Student)
          .filter(student => student !== null);

        this.filteredStudents = [...this.students];
        this.updatePagination();
        
        console.log(`Fetched ${this.students.length} enrolled students`);
      } else {
        console.log('No enrolled students found for this module');
        this.students = [];
        this.filteredStudents = [];
        this.updatePagination();
      }
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
      this.presentToast('Error fetching enrolled students', 'danger');
    }
  }

  filterStudents() {
    if (this.searchTerm.trim() === '') {
      this.filteredStudents = this.students;
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredStudents = this.students.filter(student =>
        student.name.toLowerCase().includes(searchLower) ||
        student.surname.toLowerCase().includes(searchLower) ||
        student.studentNumber.includes(searchLower)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
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

  /*filterStudents() {
    if (this.searchTerm.trim() === '') {
      this.filteredStudents = this.students; // students are already filtered by department
    } else {
      this.filteredStudents = this.students.filter(student =>
        (student.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        student.studentNumber.includes(this.searchTerm.toLowerCase())) &&
        student.department === this.department
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }
*/
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