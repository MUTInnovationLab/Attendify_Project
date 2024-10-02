import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';

interface TimetableEntry {
  course: string;
  day: string;
  module: string;
  lectureVenue: string;
  timeSlot: string;
}

interface TimetableDocument {
  course: string;
  department: string;
  events: TimetableEntry[];
  faculty: string;
  year: string;
}

@Component({
  selector: 'app-timetable-view',
  templateUrl: './timetable-view.page.html',
  styleUrls: ['./timetable-view.page.scss'],
})
export class TimetableViewPage implements OnInit {
  selectedFaculty: string = '';
  selectedCourse: string = '';
  selectedLevel: string = '';
  timetableData: TimetableEntry[] = [];
  hasSearched: boolean = false;
  department: string = '';

  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  timeSlots: string[] = [];

  faculties: any[] = [
    { name: 'Faculty Of Engineering', courses: [
      'Diploma in Building', 'Diploma in Chemical Engineering', 'Diploma in Civil Engineering',
      'Diploma in Electrical Engineering', 'Diploma in Mechanical Engineering', 'Diploma in Surveying',
      'Diploma in Construction Management & Quantity Surveying', 'Advanced Diploma in Chemical Engineering',
      'Advanced Diploma in Mechanical Engineering'
    ]},
    { name: 'Faculty Of Natural Sciences​', courses: [
      'Diploma in Agriculture', 'Diploma in Analytical Chemistry', 'Diploma in Community Extension',
      'Diploma in Information Technology', 'Diploma in Nature Conservation', 'Bachelor of Science in Environmental Health',
      'Bachelor of Health Sciences in Medical Laboratory Science', 'Bachelor of Applied Science in Nature Conservation',
      'Advanced Diploma in Agriculture in Crop Production', 'Advanced Diploma in Agriculture in Animal Production',
      'Advanced Diploma in Analytical Chemistry', 'Advanced Diploma in Agriculture Extension and Community Development',
      'Advanced Diploma in ICT in Applications Development', 'Advanced Diploma in Nature Conservation',
      'Postgraduate Diploma in Nature Conservation', 'Master of Nature Conservation'
    ]},
    { name: 'Faculty Of Management​ Sciences', courses: [
      'Diploma in Accounting', 'Diploma in Cost & Management Accounting', 'Diploma in Office Management & Technology',
      'Diploma in Public Finance and Accounting', 'Diploma in Local Government and Finance', 'Diploma in Public Management',
      'Diploma in Marketing', 'Diploma in Human Resource Management', 'Advanced Diploma in Cost and Management Accounting',
      'Advanced Diploma in Accounting', 'Advanced Diploma in Office Management and Technology',
      'Advanced Diploma in Human Resource Management', 'Advanced Diploma in Marketing', 'Advanced Diploma in Public Management',
      'Postgraduate Diploma in Marketing', 'Postgraduate Diploma in Human Resources Management',
      'Postgraduate Diploma in Public Management'
    ]},
  ];

  levels: string[] = ['Pre-Tech', 'ECP', '1', '2', '3', '4', '5', '6'];

  constructor(private firestore: AngularFirestore, private toastController: ToastController) {}

  ngOnInit() {}

  loadCourses() {
    const faculty = this.faculties.find(f => f.name === this.selectedFaculty);
    return faculty ? faculty.courses : [];
  }

  onFacultyChange() {
    this.selectedCourse = '';
    this.selectedLevel = '';
    this.timeSlots = [];
  }

  onCourseChange() {
    this.timetableData = [];
  }

  onLevelChange() {
    this.timetableData = [];
  }

  async loadTimetable() {
    if (!this.selectedFaculty || !this.selectedCourse || !this.selectedLevel) {
      this.showToast('Please select faculty, course, and level.');
      return;
    }

    try {
      console.log('Querying with:', this.selectedFaculty, this.selectedCourse, this.selectedLevel);

      const timetableSnapshot = await this.firestore.collection<TimetableDocument>('timetables')
        .doc(`${this.selectedFaculty}_${this.selectedCourse}_${this.selectedLevel}`)
        .get()
        .toPromise();

      if (timetableSnapshot && timetableSnapshot.exists) {
        const data = timetableSnapshot.data() as TimetableDocument;
        console.log('Fetched document:', data);

        if (data.events && data.events.length > 0) {
          this.timetableData = data.events;
          this.department = data.department || 'Department not specified';
          this.hasSearched = true;
          this.extractTimeSlots();
          console.log('Processed timetable data:', this.timetableData);
        } else {
          this.showToast('No timetable entries found for the selected criteria.');
        }
      } else {
        console.log('No document found');
        this.showToast('No timetable found for the selected criteria.');
      }
    } catch (error) {
      console.error('Error loading timetable:', error);
      this.showToast('Error loading timetable. Please try again.');
    }
  }

  extractTimeSlots() {
    const timeSlotSet = new Set<string>();
    this.timetableData.forEach(entry => {
      timeSlotSet.add(entry.timeSlot);
    });
  
    this.timeSlots = Array.from(timeSlotSet).sort((a, b) => {
      const startTimeA = this.extractTime(a);
      const startTimeB = this.extractTime(b);
      return startTimeA - startTimeB;
    });
  }

  extractTime(timeSlot: string): number {
    const [start] = timeSlot.split(' - ');
    const [hour, minute] = start.split(':').map(Number);
    return hour * 60 + minute;
  }

  getModuleForTimeSlot(day: string, timeSlot: string): string {
    const entry = this.timetableData.find(
      e => e.day === day && e.timeSlot === timeSlot
    );
    return entry ? `${entry.module} (${entry.lectureVenue})` : '-';
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }
}