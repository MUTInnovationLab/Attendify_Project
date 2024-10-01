import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';

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
  selectedDays: string[] = [];  // Changed to an array to hold multiple days
  allModules: Module[] = [];
  startTime: string = '12:00'; // Default start time
  endTime: string = '13:00'; // Default end time

  constructor(private firestore: AngularFirestore, private toastController: ToastController) {}

  ngOnInit() {
    this.loadModules();
    this.setDefaultTimes();
  }

  loadCourses() {
    const faculty = this.faculties.find(f => f.name === this.selectedFaculty);
    return faculty ? faculty.courses : [];
  }

  async loadModules() {
    try {
      const modulesSnapshot = await this.firestore.collection<Module>('modules').get().toPromise();

      if (modulesSnapshot && modulesSnapshot.docs.length > 0) {
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

  setDefaultTimes() {
    const currentDate = new Date();
    const hours = ('0' + currentDate.getHours()).slice(-2); 
    const minutes = ('0' + currentDate.getMinutes()).slice(-2);
    this.startTime = `${hours}:${minutes}`; 
    this.endTime = `${hours}:${('0' + (currentDate.getMinutes() + 60) % 60).slice(-2)}`; 
  }

  async addTimetable() {
    if (!this.selectedFaculty || !this.selectedCourse || !this.selectedModuleCode || !this.selectedDays.length || !this.startTime || !this.endTime) {
      console.error('Please complete all fields before submitting the timetable.');
      this.showToast('Please complete all fields.');
      return;
    }

    if (this.startTime >= this.endTime) {
      this.showToast('End time must be after start time.');
      return;
    }

    // Create the timeSlot string by combining start and end times
    const timeSlot = `${this.startTime} - ${this.endTime}`;

    // Iterate over each selected day and create a timetable entry
    for (const day of this.selectedDays) {
      const timetableEntry = {
        faculty: this.selectedFaculty,
        course: this.selectedCourse,
        moduleCode: this.selectedModuleCode,
        day: day,
        room: this.room,
        timeSlot: timeSlot, // Store the timeSlot as a single field
      };

      try {
        await this.firestore.collection('timetables').add(timetableEntry);
      } catch (error) {
        console.error('Error adding timetable entry: ', error);
        this.showToast('Failed to add timetable entry.');
        return;
      }
    }

    this.showToast('Timetable entries added successfully!');
    this.clearFields();
  }

  clearFields() {
    this.selectedFaculty = '';
    this.selectedCourse = '';
    this.selectedModuleCode = '';
    this.room = '';
    this.selectedDays = [];  // Reset selected days
    this.startTime = '12:00';
    this.endTime = '13:00';
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
