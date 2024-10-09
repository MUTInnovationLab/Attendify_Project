import { Component } from '@angular/core';
import { AcademicCalendarService } from '../services/academic-calendar.service'; // Adjust path as necessary
import { ToastController } from '@ionic/angular';

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

  constructor(
    private academicCalendarService: AcademicCalendarService,
    private toastController: ToastController
  ) { }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
    });
    toast.present();
  }

  addEvent() {
    if (this.newEvent.date && this.newEvent.description) {
      if (this.eventIdToUpdate) {
        this.academicCalendarService.updateEvent(this.eventIdToUpdate, this.newEvent).then(() => {
          this.presentToast('Event updated successfully');
          this.resetForm();
        }).catch(error => {
          console.error('Error updating event: ', error);
        });
      } else {
        this.academicCalendarService.addEvent(this.newEvent).then(() => {
          this.presentToast('Event added successfully');
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
