import { Component } from '@angular/core';
import { AcademicCalendarService } from '../services/academic-calendar.service'; // Adjust path as necessary

@Component({
  selector: 'app-event',
  templateUrl: './event.page.html',
  styleUrls: ['./event.page.scss'],
})
export class EventPage {
  newEvent = {
    date: new Date().toISOString(),
    description: ''
  };
  eventIdToUpdate: string | null = null;
  selectedYear: number = new Date().getFullYear();
  eventsForYear: any[] = [];

  constructor(private academicCalendarService: AcademicCalendarService) { }

  addEvent() {
    if (this.newEvent.date && this.newEvent.description) {
      if (this.eventIdToUpdate) {
        this.academicCalendarService.updateEvent(this.eventIdToUpdate, this.newEvent).then(() => {
          console.log('Event updated successfully');
          this.resetForm();
        }).catch(error => {
          console.error('Error updating event: ', error);
        });
      } else {
        this.academicCalendarService.addEvent(this.newEvent).then(() => {
          console.log('Event added successfully');
          this.resetForm();
        }).catch(error => {
          console.error('Error adding event: ', error);
        });
      }
    } else {
      console.error('Date and description are required');
    }
  }

  updateEvent(eventId: string, eventData: any) {
    this.eventIdToUpdate = eventId;
    this.newEvent = { ...eventData };
  }

  // Modify the method to accept a year parameter
  deleteAllEventsForYear(year: number) {
    if (confirm(`Are you sure you want to delete all events for ${year}?`)) {
      this.academicCalendarService.deleteAllEventsForYear(year).then(() => {
        console.log(`All events for ${year} deleted successfully`);
        this.loadEventsForYear();
      }).catch(error => {
        console.error('Error deleting events: ', error);
      });
    }
  }

  loadEventsForYear() {
    this.academicCalendarService.getEventsForYear(this.selectedYear).subscribe(
      events => {
        this.eventsForYear = events;
      },
      error => {
        console.error('Error loading events: ', error);
      }
    );
  }

  resetForm() {
    this.newEvent = {
      date: new Date().toISOString(),
      description: ''
    };
    this.eventIdToUpdate = null;
  }
}
