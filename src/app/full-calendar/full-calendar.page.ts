import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-full-calendar',
  templateUrl: './full-calendar.page.html',
  styleUrls: ['./full-calendar.page.scss'],
})
export class FullCalendarPage implements OnInit {

  events$!: Observable<any[]>; // Use definite assignment assertion
  months: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  events: any[] = []; // All events for the year

  constructor(private firestore: AngularFirestore) {}

  ngOnInit() {
    this.events$ = this.firestore.collection('events').valueChanges({ idField: 'id' });
    this.events$.subscribe(events => {
      this.events = events;
    });
  }

  getEventsByMonth(month: number) {
    const startOfMonth = new Date(new Date().getFullYear(), month, 1);
    const endOfMonth = new Date(new Date().getFullYear(), month + 1, 0);
    return this.events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startOfMonth && eventDate <= endOfMonth;
    });
  }

  getDaysInMonth(month: number) {
    const year = new Date().getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }
}

