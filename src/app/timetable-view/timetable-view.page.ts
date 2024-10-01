import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';

interface TimetableEntry {
  faculty: string;
  course: string;
  day: string;
  moduleCode: string;
  room: string;
  timeSlot: string; // Assuming timeSlot is stored in a consistent format
}

@Component({
  selector: 'app-timetable-view',
  templateUrl: './timetable-view.page.html',
  styleUrls: ['./timetable-view.page.scss'],
})
export class TimetableViewPage implements OnInit {
  selectedFaculty: string = '';
  selectedCourse: string = '';
  timetableData: TimetableEntry[] = [];
  hasSearched: boolean = false;
  
  // Days of the week
  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Dynamically populated time slots from Firestore
  timeSlots: string[] = [];

  faculties: any[] = [
    { name: 'Engineering', courses: ['Electrical', 'Chemical', 'Civil'] },
    { name: 'Natural Science', courses: ['Information Technology', 'Agriculture'] },
    { name: 'Management and Science', courses: ['Human Resources', 'Accounting'] },
  ];

  constructor(private firestore: AngularFirestore, private toastController: ToastController) {}

  ngOnInit() {}

  loadCourses() {
    const faculty = this.faculties.find(f => f.name === this.selectedFaculty);
    return faculty ? faculty.courses : [];
  }

  onFacultyChange() {
    this.selectedCourse = '';
    this.timeSlots = []; // Reset time slots when faculty changes
  }

  onCourseChange() {
    this.timetableData = [];
  }

  async loadTimetable() {
    if (!this.selectedFaculty || !this.selectedCourse) {
      this.showToast('Please select both a faculty and a course.');
      return;
    }

    try {
      // Fetch the timetable entries based on the selected faculty and course
      const timetableSnapshot = await this.firestore.collection<TimetableEntry>('timetables', ref => 
        ref.where('faculty', '==', this.selectedFaculty)
           .where('course', '==', this.selectedCourse)
      ).get().toPromise();

      this.timetableData = timetableSnapshot?.docs.map(doc => doc.data() as TimetableEntry) || [];
      this.hasSearched = true;

      // Extract unique time slots from timetable data
      this.extractTimeSlots();
      
    } catch (error) {
      console.error('Error loading timetable:', error);
      this.showToast('Error loading timetable. Please try again.');
    }
  }

  // Function to extract unique time slots from timetable data
  extractTimeSlots() {
    const timeSlotSet = new Set<string>();
    this.timetableData.forEach(entry => {
      timeSlotSet.add(entry.timeSlot);
    });
  
    // Convert Set to Array and sort time slots
    this.timeSlots = Array.from(timeSlotSet).sort((a, b) => {
      // Extracting start times for comparison
      const startTimeA = this.extractTime(a);
      const startTimeB = this.extractTime(b);
      return startTimeA - startTimeB; // Ascending order
    });
  }
  
  // Helper function to extract hour and minute from timeSlot string
  extractTime(timeSlot: string): number {
    const [start] = timeSlot.split(' - '); // Get the start time
    const [hour, minute] = start.split(':').map(Number); // Split into hour and minute
    return hour * 60 + minute; // Convert to total minutes for comparison
  }
  
  // Function to get the module for a specific day and time slot
  getModuleForTimeSlot(day: string, timeSlot: string): string {
    const entry = this.timetableData.find(
      e => e.day === day && e.timeSlot === timeSlot
    );
    return entry ? `${entry.moduleCode} (${entry.room})` : '-';
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
