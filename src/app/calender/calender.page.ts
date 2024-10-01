import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-calender',
  templateUrl: './calender.page.html',
  styleUrls: ['./calender.page.scss'],
})
export class CalenderPage implements OnInit {
  currentDate: string = new Date().toISOString();
  selectedDate: string = '';
  eventsForTheDay: any[] = [];
  allEventsGroupedByMonth: { [key: string]: any[] } = {};
  events$!: Observable<any[]>;
  showFullCalendar: boolean = false;

  monthNames: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(private firestore: AngularFirestore) {}

  ngOnInit() {
    this.selectedDate = this.currentDate.substring(0, 10);
    this.events$ = this.firestore.collection('academic-events').valueChanges({ idField: 'id' });
    this.loadEvents();
  }

  loadEvents() {
    this.events$.subscribe(events => {
      this.eventsForTheDay = events.filter(event =>
        event.date.substring(0, 10) === this.selectedDate
      );

      // Group events by month
      const groupedEvents: { [key: string]: any[] } = {};
      this.monthNames.forEach(month => {
        groupedEvents[month] = [];
      });

      events.forEach(event => {
        const eventDate = new Date(event.date);
        const eventMonth = this.monthNames[eventDate.getMonth()];
        groupedEvents[eventMonth].push(event);
      });

      // Sort events within each month
      Object.keys(groupedEvents).forEach(month => {
        groupedEvents[month].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      });

      // Assign the sorted and grouped events to allEventsGroupedByMonth
      this.allEventsGroupedByMonth = groupedEvents;
    });
  }

  onDateChange(event: any) {
    this.selectedDate = event.detail.value.substring(0, 10);
    this.loadEvents();
  }

  toggleCalendarView() {
    this.showFullCalendar = !this.showFullCalendar;
  }
}