import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-full-calendar',
  templateUrl: './full-calendar.page.html',
  styleUrls: ['./full-calendar.page.scss'],
})
export class FullCalendarPage implements OnInit {
  events$!: Observable<any[]>;
  months: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  weekDays: string[] = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  events: any[] = [];

  constructor(private firestore: AngularFirestore) {}

  ngOnInit() {
    // Fetch events from Firestore
    this.events$ = this.firestore.collection('events').valueChanges({ idField: 'id' });
    this.events$.subscribe(events => {
      this.events = events;
    });
  }

  // Get events for a specific month
  getEventsByMonth(month: number) {
    const startOfMonth = new Date(new Date().getFullYear(), month, 1);
    const endOfMonth = new Date(new Date().getFullYear(), month + 1, 0);
    return this.events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startOfMonth && eventDate <= endOfMonth;
    });
  }

  // Get all days in the month, filling in blank spaces for days before the first of the month
  getDaysInMonth(month: number): number[] {
    const year = new Date().getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const daysArray = Array(startDay).fill(0); // Blank spaces for previous days
    return [...daysArray, ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  }

  // Check if a specific day has an event
  isEventOnDay(eventDate: string, day: number): boolean {
    const date = new Date(eventDate);
    return date.getDate() === day;
  }

  // Determine if the day should be shaded due to an event
  hasEventOnDay(month: number, day: number): boolean {
    return this.getEventsByMonth(month).some(event => this.isEventOnDay(event.date, day));
  }

  // Divide months into columns for layout purposes (3 columns, 4 months each)
  getMonthsForColumn(columnIndex: number): number[] {
    return [0, 1, 2, 3].map(i => columnIndex * 4 + i);
  }
}
