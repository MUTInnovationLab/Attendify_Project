import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';

interface TimetableEntry {
  faculty: string;
  course: string;
  room: string;
  day: string;
  moduleCode: string;
  timeSlot: string;
}

@Component({
  selector: 'app-timetable-view',
  templateUrl: './timetable-view.page.html',
  styleUrls: ['./timetable-view.page.scss'],
})
export class TimetableViewPage implements OnInit {
  timetable: TimetableEntry[] = [];
  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  constructor(private firestore: AngularFirestore) {}

  ngOnInit() {
    this.loadTimetable();
  }

  async loadTimetable() {
    try {
      const timetableSnapshot = await this.firestore.collection('timetables').get().toPromise();
      this.timetable = timetableSnapshot?.docs.map(doc => doc.data() as TimetableEntry) || [];
      console.log('Loaded Timetable:', this.timetable);
    } catch (error) {
      console.error('Error loading timetable:', error);
    }
  }

  getModuleForTime(day: string, time: string): string {
    const entry = this.timetable.find(t => t.day === day && t.timeSlot === time);
    return entry ? entry.moduleCode : ''; // Return module code or empty string if not found
  }
  
}
