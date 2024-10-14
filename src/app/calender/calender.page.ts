import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';

interface StudentData {
  email: string;
  name: string;
  studentNumber: string;
  surname: string;
  moduleCode:string;
}

@Component({
  selector: 'app-calender',
  templateUrl: './calender.page.html',
  styleUrls: ['./calender.page.scss'],
})
export class CalenderPage implements OnInit {
  showUserInfo = false;
  currentUser: StudentData = { moduleCode: '' ,email: '', name: '', studentNumber: '', surname: '' };

  currentDate: string = new Date().toISOString();
  selectedDate: string = '';
  selectedYear: number = new Date().getFullYear();
  eventsForTheDay: any[] = [];
  allEventsGroupedByMonth: { [key: string]: any[] } = {};
  events$!: Observable<any[]>;
  showFullCalendar: boolean = false;

  monthNames: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  yearOptions: number[] = [];

  constructor(private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private router: Router
  ) {}

  ngOnInit() {
    this.selectedDate = this.currentDate.substring(0, 10);
    this.selectedYear = new Date().getFullYear();
    this.generateYearOptions();
    this.events$ = this.firestore.collection('academic-events').valueChanges({ idField: 'id' });
    this.loadEvents();
    this.getCurrentUser();
  }

  getCurrentUser() {
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('User signed in:', user.email);
        this.firestore
          .collection('enrolledModules', (ref) =>
            ref.where('email', '==', user.email)
          )
          .get()
          .subscribe(
            (querySnapshot) => {
              if (querySnapshot.empty) {
                console.log('No user found with this email');
              } else {
                querySnapshot.forEach((doc) => {
                  this.currentUser = doc.data() as StudentData;
                  console.log('Current User:', this.currentUser);
                });
              }
            },
            (error) => {
              console.error('Error fetching user data:', error);
            }
          );
      } else {
        console.log('No user is signed in');
      }
    });
  }

  // Generate year options for the year selector
  generateYearOptions() {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      this.yearOptions.push(i);
    }
  }

  loadEvents() {
    this.events$.subscribe(events => {
      // Filter events for the selected day
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
        const eventYear = eventDate.getFullYear();
        if (eventYear === this.selectedYear) {
          const eventMonth = this.monthNames[eventDate.getMonth()];
          groupedEvents[eventMonth].push(event);
        }
      });

      // Sort events by date within each month in ascending order
      Object.keys(groupedEvents).forEach(month => {
        groupedEvents[month].sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getDate() - dateB.getDate(); // Compare day of the month
        });
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

  toggleUserInfo(){}
}
