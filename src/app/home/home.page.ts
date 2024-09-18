import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {

  currentDate: string = new Date().toISOString();
  announcements: any[] = [];
  departments: any[] = [];
  selectedDepartment: string = '';
  timetable: any[] = [];

  constructor() {}

  ngOnInit() {
    this.loadAnnouncements();
    this.loadDepartments();
  }

  loadAnnouncements() {
    this.announcements = [
      { title: 'Welcome to the New Semester', description: 'Classes start next Monday. Be prepared!' },
      { title: 'Library Hours Update', description: 'The library will now close at 10 PM.' },
      // More announcements
    ];
  }

  loadDepartments() {
    this.departments = [
      { name: 'Computer Science', id: 'cs' },
      { name: 'Engineering', id: 'eng' },
      { name: 'Business', id: 'bus' },
      // Add more departments
    ];
  }

  loadTimetable() {
    // Logic to load timetable for the selected department
    if (this.selectedDepartment === 'cs') {
      this.timetable = [
        { name: 'Data Structures', time: 'Mon 9:00 AM - 11:00 AM' },
        { name: 'Algorithms', time: 'Tue 11:00 AM - 1:00 PM' },
        // More courses for Computer Science
      ];
    } else if (this.selectedDepartment === 'eng') {
      this.timetable = [
        { name: 'Mechanics', time: 'Mon 10:00 AM - 12:00 PM' },
        { name: 'Thermodynamics', time: 'Wed 1:00 PM - 3:00 PM' },
        // More courses for Engineering
      ];
    } else if (this.selectedDepartment === 'bus') {
      this.timetable = [
        { name: 'Marketing 101', time: 'Mon 9:00 AM - 11:00 AM' },
        { name: 'Financial Accounting', time: 'Tue 11:00 AM - 1:00 PM' },
        // More courses for Business
      ];
    }
  }

  goToLogin() {
    // Navigate to the login page
  }

  viewFullCalendar() {
    // Logic to view the full academic calendar
  }
}
