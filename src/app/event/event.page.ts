import { Component } from '@angular/core';
import { AcademicCalendarService } from '../services/academic-calendar.service'; // Adjust path as necessary

@Component({
  selector: 'app-event',
  templateUrl: './event.page.html',
  styleUrls: ['./event.page.scss'],
})
export class EventPage {

  newEvent = {
    date: new Date().toISOString(), // Initialize with current date and time
    description: ''
  };

  constructor(private academicCalendarService: AcademicCalendarService) { }

  addEvent() {
    if (this.newEvent.date && this.newEvent.description) {
      this.academicCalendarService.addEvent(this.newEvent).then(() => {
        console.log('Event added successfully');
        this.resetForm();
      }).catch(error => {
        console.error('Error adding event: ', error);
      });
    } else {
      console.error('Date and description are required');
    }
  }

  resetForm() {
    this.newEvent = {
      date: new Date().toISOString(), // Reset to current date and time
      description: ''
    };
  }
}
