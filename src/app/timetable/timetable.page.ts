import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';

// Define the structure of your module data
interface Module {
  moduleCode: string;
  faculty: string;
  course: string;
}

@Component({
  selector: 'app-timetable',
  templateUrl: './timetable.page.html',
  styleUrls: ['./timetable.page.scss'],
})
export class TimetablePage implements OnInit {
  faculties: any[] = [
    { name: 'Engineering', courses: ['Electrical', 'Chemical', 'Civil'] },
    { name: 'Natural Science', courses: ['Information Technology', 'Agriculture'] },
    { name: 'Management and Science', courses: ['Human Resources', 'Accounting'] },
  ];

  selectedFaculty: string = '';
  selectedCourse: string = '';
  selectedModuleCode: string = '';
  room: string = '';
  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  selectedDay: string = '';
  allModules: Module[] = []; // Store the full module data
  timeSlot: string = '';

  constructor(private firestore: AngularFirestore, private toastController: ToastController) {}

  ngOnInit() {
    this.loadModules();
  }

  loadCourses() {
    const faculty = this.faculties.find(f => f.name === this.selectedFaculty);
    return faculty ? faculty.courses : [];
  }

  // Updated to fetch all module data with specific typing
  async loadModules() {
    try {
      const modulesSnapshot = await this.firestore.collection<Module>('modules').get().toPromise();
  
      if (modulesSnapshot && modulesSnapshot.docs.length > 0) {
        // Type each document correctly
        this.allModules = modulesSnapshot.docs.map(doc => doc.data() as Module);
        console.log('All Modules:', this.allModules);
      } else {
        console.log('No modules found in Firestore.');
        this.allModules = [];
      }
    } catch (error) {
      console.error('Error loading modules: ', error);
    }
  }

  onFacultyChange() {
    this.selectedCourse = '';
    this.selectedModuleCode = '';
  }

  onCourseChange() {
    this.selectedModuleCode = '';
  }

  async addTimetable() {
    if (!this.selectedFaculty || !this.selectedCourse || !this.selectedModuleCode || !this.selectedDay || !this.timeSlot) {
      console.error('Please complete all fields before submitting the timetable.');
      this.showToast('Please complete all fields.');
      return;
    }

    const timetableEntry = {
      faculty: this.selectedFaculty,
      course: this.selectedCourse,
      room: this.room,
      day: this.selectedDay,
      moduleCode: this.selectedModuleCode,
      timeSlot: this.timeSlot,
    };

    try {
      await this.firestore.collection('timetables').add(timetableEntry);
      this.showToast('Timetable entry added successfully!');
      this.clearFields();
    } catch (error) {
      console.error('Error adding timetable entry: ', error);
      this.showToast('Failed to add timetable entry.');
    }
  }

  clearFields() {
    this.selectedFaculty = '';
    this.selectedCourse = '';
    this.selectedModuleCode = '';
    this.room = '';
    this.selectedDay = '';
    this.timeSlot = '';
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
