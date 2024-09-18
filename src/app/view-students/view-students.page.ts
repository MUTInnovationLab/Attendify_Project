import { Component, OnInit } from '@angular/core';
import { StudentService } from '../services/student.service';
import { ModalController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';


export interface Student {
  studentNumber: number; // Ensure studentNumber is of type number
  name: string;
  surname: string;
  email: string;
}

export interface EnrolledModule {
  moduleCode: string[]; // Array of module codes
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
  studentModules: string[] = []; // To store modules for the selected student
  searchTerm: string = ''; // To hold the search term

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
          this.filteredStudents = students; // Initialize filteredStudents
        },
        error => {
          console.error('Error fetching students:', error);
        }
      );
  }


  async fetchModulesForStudent(studentNumber: number): Promise<string[]> {
    const modules: string[] = [];
    
    try {
      const studentNumberStr = studentNumber.toString();
      const docRef = this.firestore.collection<EnrolledModule>('enrolledModules').doc(studentNumberStr);
      const docSnapshot = await docRef.get().toPromise();
      
      // Check if docSnapshot exists and is not undefined
      if (docSnapshot && docSnapshot.exists) {
        const data = docSnapshot.data() as EnrolledModule | undefined;
        
        // Ensure data is defined and has the correct structure
        if (data && Array.isArray(data.moduleCode)) {
          data.moduleCode.forEach((code: string) => {
            if (code && !modules.includes(code)) {
              modules.push(code);
            }
          });
          
          console.log('Modules for student:', modules);
        } else {
          console.log('No moduleCode field found or it is not an array.');
        }
      } else {
        console.log('No document found for student number:', studentNumber);
      }
      
      return modules;
    } catch (error) {
      console.error('Error fetching modules for student:', error);
      return []; // Return an empty array on exception
    }
  }
  
  
  async onStudentClick(student: Student) {
    console.log('Clicked student object:', JSON.stringify(student, null, 2));
    this.selectedStudent = student;

    if (student && student.studentNumber !== undefined) {
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
    this.router.navigate(['/lecture']); // Navigate to the lazy loaded module path
  }

  dismiss() {
    this.router.navigate(['/lecture']); // Navigate to LecturePage
  }

  filterStudents() {
    if (this.searchTerm.trim() === '') {
      this.filteredStudents = this.students;
    } else {
      this.filteredStudents = this.students.filter(student =>
        student.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        student.studentNumber.toString().includes(this.searchTerm.toLowerCase())
      );
    }
  }
}
