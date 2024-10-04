import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { getFirestore, doc, collection, getDocs } from 'firebase/firestore';
import { DataService } from '../services/data.service';

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

  constructor(
    private firestore: AngularFirestore,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadLecturers();
    this.loadStudents();
    const db = getFirestore();
  }

  // Simulate data loading with a delay
  private loadDataWithDelay(data: any[], page: number, pageSize: number, callback: (data: any[]) => void) {
    setTimeout(() => {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      callback(data.slice(startIndex, endIndex));
    }, 500); // 500ms delay
  }

  loadLecturers() {
    this.firestore.collection('/registered staff/').valueChanges().subscribe((staff: any[]) => {
      this.lecturers = staff.filter(staffMember => staffMember.position === 'lecturer');
      this.loadDataWithDelay(this.lecturers, this.currentLecturerPage, this.lecturersPageSize, (data) => {
        this.displayedLecturers = data;
      });
    });
  }

  loadStudents() {
    this.firestore.collection('/registeredStudents/').valueChanges().subscribe((students: any[]) => {
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

  toggleStudentTable() {
    this.showStudents = !this.showStudents;
  }

  backToLecturerTable() {
    this.showStudents = false;
  }

  navigateToDeptAnalysis() {
    this.router.navigate(['/dept-analytics']);
  }

  searchLecturers() {
    if (this.searchStaffNumber.trim() !== '') {
      this.currentLecturerPage = 1; 

      this.firestore.collection('registered staff', ref => ref
        .where('staffNumber', '>=', this.searchStaffNumber)
        .where('staffNumber', '<=', this.searchStaffNumber + '\uf8ff')) // This ensures partial matching
        .valueChanges()
        .subscribe((staff: any[]) => {
          this.lecturers = staff.filter(staffMember => staffMember.position === 'lecturer');
  
          // Display the matching lecturers with pagination
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
      // Use Firestore query with '>=', '==' and limit for partial matches
      this.firestore.collection('registeredStudents', ref => ref
        .where('studentNumber', '>=', this.searchStudentNumber)
        .where('studentNumber', '<=', this.searchStudentNumber + '\uf8ff')) // Ensures partial matching
        .valueChanges()
        .subscribe((students: any[]) => {
          this.students = students.map(student => ({
            ...student,
            fullName: `${student.name} ${student.surname}`
          }));
  
          // Display the matching students with pagination
          this.loadDataWithDelay(this.students, this.currentStudentPage, this.studentsPageSize, (data) => {
            this.displayedStudents = data;
          });
        });
    } else {
      this.loadStudents(); // Reset search if the input is empty
    }
  }  

  updateLecturer(lecturer: any) {
    this.firestore.collection('/registered staff/').doc(lecturer.staffNumber).update({
      fullName: lecturer.fullName,
      email: lecturer.email,
      position: lecturer.position,
      department: lecturer.department
    }).then(() => {
      this.showToast('Lecturer updated successfully');
      this.editingLecturerStaffNumber = null; // Exit editing mode
    });
  }

  deleteLecturer(staffNumber: string) {
    // alert(staffNumber);
    this.firestore.collection('registered staff')
      .ref.where('staffNumber', '==', staffNumber)
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          doc.ref.delete();
        });
        this.presentToast('Lecturer successfully deleted!');
      })
      .catch(error => {
        console.error("Error deleting lecturer: ", error);
      });
  }

  updateStudent(student: any) {
    this.firestore.collection('/registeredStudents/').doc(student.studentNumber).update({
      name: student.name,
      email: student.email,
      surname: student.surname
    }).then(() => {
      this.showToast('Student updated successfully');
      this.editingStudentNumber = null; // Exit editing mode
    });
  }

  deleteStudent(studentNumber: string) {
    // alert(studentNumber);
    this.firestore.collection('registeredStudents')
      .ref.where('studentNumber', '==', studentNumber)
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          doc.ref.delete();
        });
        this.presentToast('Lecturer successfully deleted!');
      })
      .catch(error => {
        console.error("Error deleting lecturer: ", error);
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
}
