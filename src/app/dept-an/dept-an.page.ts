import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// Register the required Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-dept-an',
  templateUrl: './dept-an.page.html',
  styleUrls: ['./dept-an.page.scss'],
})
export class DeptAnPage implements OnInit {
  lecturers: any[] = [];
  students: any[] = [];
  searchStaffNumber: string = '';
  searchStudentNumber: string = '';
  showStudentTable: boolean = false;
  showAnalytics: boolean = false;
  showLecturerSearchCard: boolean = true;
  showStudentSearchCard: boolean = false;
  editingLecturerStaffNumber: string | null = null;
  editingStudentNumber: string | null = null;

  constructor(
    private firestore: AngularFirestore,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.fetchLecturers();
    this.fetchStudents();
    // this.createPieChart();
  }

  async fetchLecturers() {
    this.firestore.collection('/registered staff/').valueChanges().subscribe((staff: any[]) => {
      this.lecturers = staff.filter(staffMember => staffMember.position === 'lecturer');
      if (this.showAnalytics) {
        this.updateLecturersChart();
      }
    });
  }



  async searchLecturers() {
    if (this.searchStaffNumber.trim() === '') {
      this.fetchLecturers();
    } else {
      this.firestore.collection('/registered staff/', ref => ref.where('staffNumber', '==', this.searchStaffNumber))
        .valueChanges()
        .subscribe((staff: any[]) => {
          this.lecturers = staff.filter(staffMember => staffMember.position === 'lecturer');
        });
    }
  }

  async fetchStudents() {
    this.firestore.collection('/registeredStudents/').valueChanges().subscribe((students: any[]) => {
      this.students = students.map(student => ({
        ...student,
        fullName: `${student.name} ${student.surname}`
      }));
      if (this.showAnalytics) {
        this.updateStudentsChart();
      }
    });
  }

  async searchStudents() {
    if (this.searchStudentNumber.trim() === '') {
      this.fetchStudents();
    } else {
      this.firestore.collection('/registeredStudents/', ref => ref.where('studentNumber', '==', this.searchStudentNumber))
        .valueChanges()
        .subscribe((students: any[]) => {
          this.students = students;
        });
    }
  }

  editLecturer(lecturer: any) {
        this.editingLecturerStaffNumber = lecturer.staffNumber;
      }
    
      async updateLecturer(lecturer: any) {
        if (lecturer) {
          try {
            
            const snapshot = await this.firestore.collection('/registered staff', ref => ref.where('staffNumber', '==', lecturer.staffNumber)).get().toPromise();
            if (snapshot && !snapshot.empty) {
              snapshot.forEach(async doc => {
                await this.firestore.collection('/registered staff').doc(doc.id).update(lecturer);
              });
              await this.showToast('Lecturer successfully updated!');
              this.editingLecturerStaffNumber = null;
              this.fetchLecturers();
            } else {
              await this.showToast('Lecturer not found!');
            }
          } catch (error) {
            console.error('Error updating lecturer: ', error);
            await this.showToast('Failed to update lecturer.');
          }
        }
      }
    
      async deleteLecturer(staffNumber: string) {
        try {
          const snapshot = await this.firestore.collection('/registered staff', ref => ref.where('staffNumber', '==', staffNumber)).get().toPromise();
          if (snapshot && !snapshot.empty) {
            snapshot.forEach(async doc => {
              await this.firestore.collection('/registered staff').doc(doc.id).delete();
            });
            await this.showToast('Lecturer successfully deleted!');
            this.fetchLecturers();
          } else {
            await this.showToast('Lecturer not found!');
          }
        } catch (error) {
          console.error('Error deleting lecturer: ', error);
          await this.showToast('Failed to delete lecturer.');
        }
      }
    

      editStudent(student: any) {
            this.editingStudentNumber = student.studentNumber;
          }
        
          async updateStudent(student: any) {
            if (student) {
              try {
                const snapshot = await this.firestore.collection('/registeredStudents', ref => ref.where('studentNumber', '==', student.studentNumber)).get().toPromise();
                if (snapshot && !snapshot.empty) {
                  snapshot.forEach(async doc => {
                    await this.firestore.collection('/registeredStudents').doc(doc.id).update(student);
                  });
                  await this.showToast('Student successfully updated!');
                  this.editingStudentNumber = null;
                  this.fetchStudents();
                } else {
                  await this.showToast('Student not found!');
                }
              } catch (error) {
                console.error('Error updating student: ', error);
                await this.showToast('Failed to update student.');
              }
            }
          }
        
          async deleteStudent(studentNumber: string) {
            try {
              const snapshot = await this.firestore.collection('/registeredStudents', ref => ref.where('studentNumber', '==', studentNumber)).get().toPromise();
              if (snapshot && !snapshot.empty) {
                snapshot.forEach(async doc => {
                  await this.firestore.collection('/registeredStudents').doc(doc.id).delete();
                });
                await this.showToast('Student successfully deleted!');
                this.fetchStudents();
              } else {
                await this.showToast('Student not found!');
              }
            } catch (error) {
              console.error('Error deleting student: ', error);
              await this.showToast('Failed to delete student.');
            }
          }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: 'dark'
    });
    toast.present();
  }

  toggleStudentTable() {
    this.showStudentTable = !this.showStudentTable;
  }

  showAnalyticsContent() {
    this.showAnalytics = true;
    this.showStudentTable = false;
    this.showLecturerSearchCard = false;
  }

  backToTables() {
    this.showAnalytics = false;
    this.showStudentTable = false;
    this.showLecturerSearchCard = true;
  }

  
async updateLecturersChart() {
  const canvas = document.getElementById('lecturerAttendanceChart') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  
  if (ctx) { // Ensure ctx is not null
    try {
      // Fetch all lecturers
      const lecturersSnapshot = await this.firestore.collection('/registered staff').get().toPromise();
      
      // Ensure lecturersSnapshot is not undefined
      if (lecturersSnapshot && !lecturersSnapshot.empty) {
        const lecturers = lecturersSnapshot.docs.map(doc => doc.data() as any);
        
        // Create labels and data arrays
        const departments = Array.from(new Set(lecturers.map(lecturer => lecturer.department)));
        const data = departments.map(dept => lecturers.filter(lecturer => lecturer.department === dept).length);
        
        // Update the chart with dynamic labels and data
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: departments,
            datasets: [{
              label: 'Lecturers by Department',
              data: data,
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1
            }]
          },
          options: {
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      } else {
        console.warn('No lecturers found in the registered staff collection.');
      }
    } catch (error) {
      console.error('Error fetching lecturers data for chart:', error);
    }
  }
}


  async updateStudentsChart() {
    const canvas = document.getElementById('studentAttendanceChart') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (ctx) { // Ensure ctx is not null
      try {
        // Fetch all students
        const studentsSnapshot = await this.firestore.collection('/registeredStudents/').get().toPromise();

        // Ensure studentsSnapshot is not undefined
        if (studentsSnapshot && !studentsSnapshot.empty) {
          // Type assertion to cast to the correct type
          const students = studentsSnapshot.docs.map(doc => doc.data() as { studentNumber: string });

          // Create labels and data arrays using studentNumber
          const labels = students.map(student => student.studentNumber);
          const data = students.map(() => 1); // Each student has a count of 1

          // Update the chart with dynamic labels and data
          new Chart(ctx, {
            type: 'pie', // You can use 'bar' or other chart types if needed
            data: {
              labels: labels,
              datasets: [{
                label: 'Students by Student Number',
                data: data,
                backgroundColor: labels.map(() => 'rgba(75, 192, 192, 0.2)'), // Repeated color for simplicity
                borderColor: labels.map(() => 'rgba(75, 192, 192, 1)'), // Repeated color for simplicity
                borderWidth: 1
              }]
            },
            options: {
              responsive: true
            }
          });
        } else {
          console.warn('No students found in the registeredStudents collection.');
        }
      } catch (error) {
        console.error('Error fetching students data for chart:', error);
      }
    }
  }

  backToLecturerTable() {
    this.showStudentTable = false;
    this.showLecturerSearchCard = true; // Assuming you want to show the lecturer search card again
  }  

  cancelEdit() {
    this.editingLecturerStaffNumber = null; // Reset editing state for lecturers
  }

  cancelStudentEdit() {
    this.editingStudentNumber = null; // Reset editing state for students
  }
}
