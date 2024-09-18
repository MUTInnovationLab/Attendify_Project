import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Router } from '@angular/router'; // Import Router

@Component({
  selector: 'app-calender',
  templateUrl: './calender.page.html',
  styleUrls: ['./calender.page.scss'],
})
export class CalenderPage implements OnInit {

  currentDate: string = new Date().toISOString(); // Current date in ISO string format
  selectedDate: string = ''; // To store the selected date
  eventsForTheDay: any[] = []; // To store filtered events for the selected date
  events$!: Observable<any[]>; // Use definite assignment assertion

  constructor(private firestore: AngularFirestore, private router: Router) {} // Inject Router

  ngOnInit() {
    this.selectedDate = this.currentDate.substring(0, 10); // Set initial selected date to today
    this.events$ = this.firestore.collection('events').valueChanges({ idField: 'id' });
    this.filterEventsForDate(); // Load today's events
  }

  // Filter the events based on the selected date
  filterEventsForDate() {
    this.events$.subscribe(events => {
      console.log('Selected Date:', this.selectedDate);
      console.log('Events:', events);
      this.eventsForTheDay = events.filter(event => {
        const eventDate = event.date.substring(0, 10);
        console.log('Event Date:', eventDate);
        return eventDate === this.selectedDate;
      });
    });
  }
  
  // Handle date change from ion-datetime
  onDateChange(event: any) {
    this.selectedDate = event.detail.value.substring(0, 10); // Format the date to YYYY-MM-DD
    this.filterEventsForDate(); // Reload events for the new date
  }

  // Method to navigate to the full calendar page
  viewFullCalendar() {
    this.router.navigate(['/full-calendar']); // Adjust route path if necessary
  }
}
