import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-manage-timetable',
  templateUrl: './manage-timetable.page.html',
  styleUrls: ['./manage-timetable.page.scss'],
})
export class ManageTimetablePage implements OnInit {

  // Define constants for faculties, departments, an`d courses
  FACULTIES = {
    ENGINEERING: 'Faculty of Engineering',
    MANAGEMENT_SCIENCES: 'Faculty of Management Sciences',
    NATURAL_SCIENCES: 'Faculty of Natural Sciences'
  };

  DEPARTMENTS = {
    ENGINEERING: [
      'Chemical Engineering Department',
      'Civil Engineering and Surveying Department',
      'Construction Management and Quantity Surveying Department',
      'Electrical Engineering Department',
      'Mechanical Engineering Department'
    ],
    MANAGEMENT_SCIENCES: [
      'Accounting and Law Department',
      'Human Resource Management Department',
      'Marketing Department',
      'Office Management and Technology Department',
      'Information Public Administration & Economics Department'
    ],
    NATURAL_SCIENCES: [
      'Agriculture Department',
      'Biomedical Sciences Department',
      'Chemistry Department',
      'Community Extension Department',
      'Environmental Health Department',
      'Information Communications Technology Department'
    ]
  };

  COURSES = {
    ENGINEERING: [
      'Advanced Diploma: Chemical Engineering',
      'National Diploma: Chemical Engineering',
      'Bachelor of Technology: Chemical Engineering',
      'National Diploma: Civil Engineering',
      'National Diploma: Surveying',
      'National Diploma: Construction Management & Quantity Surveying (Building)',
      'National Diploma: Electrical Engineering',
      'National Diploma: Mechanical Engineering'
    ],
    MANAGEMENT_SCIENCES: [
      'Advanced Diploma Cost & Management Accounting',
      'Advanced Diploma in Human Resources Management',
      'Advanced Diploma Marketing',
      'Advanced Diploma in Office Management and Technology',
      'Diploma in Accounting',
      'Diploma in Cost and Management Accounting',
      'Diploma in Office Management and Technology',
      'Diploma in Human Resource Management',
      'Diploma in Marketing',
      'Diploma in Public Finance and Accounting',
      'Diploma in Public Management'
    ],
    NATURAL_SCIENCES: [
      'Diploma in Agriculture',
      'Diploma in Analytical Chemistry',
      'Diploma in Animal Production',
      'Diploma in Biomedical Technology',
      'Baccalaureus Technologiae: Biomedical Technology',
      'Diploma in Community Extension',
      'Diploma in Environmental Health',
      'Diploma in Nature Conservation',
      'Bachelor of Science in Environmental Health',
      'Advanced Diploma in Nature Conservation',
      'Advanced Diploma in Agriculture in Crop Production',
      'Diploma in Information Technology',
      'Bachelor of Health Sciences: Medical Laboratory Sciences'
    ]
  };

  faculties = Object.values(this.FACULTIES);
  departments = [...this.DEPARTMENTS.ENGINEERING, ...this.DEPARTMENTS.MANAGEMENT_SCIENCES, ...this.DEPARTMENTS.NATURAL_SCIENCES];
  years = [1, 2, 3, 4];

  // Define the type for an event
  eventType: { 
    course: string; 
    startTime: string; 
    endTime: string; 
    lecturer: string; 
  } = {
    course: '',
    startTime: '',
    endTime: '',
    lecturer: ''
  };

  // Define the type for the timetable
  timetableType: {
    faculty: string;
    department: string;
    year: string;
    events: { 
      course: string; 
      startTime: string; 
      endTime: string; 
      lecturer: string; 
    }[];
  } = {
    faculty: '',
    department: '',
    year: '',
    events: []
  };

  // New timetable object
  newTimetable: typeof this.timetableType = {
    faculty: '',
    department: '',
    year: '',
    events: []
  };

  // Temporary object for each event (course)
  event: typeof this.eventType = {
    course: '',
    startTime: '',
    endTime: '',
    lecturer: ''
  };

  courses = [...this.COURSES.ENGINEERING, ...this.COURSES.MANAGEMENT_SCIENCES, ...this.COURSES.NATURAL_SCIENCES];

  constructor(private firestore: AngularFirestore) { }

  ngOnInit() {
  }

  // Add the event to the timetable
  addEvent() {
    if (this.event.course && this.event.startTime && this.event.endTime && this.event.lecturer) {
      this.newTimetable.events.push({ ...this.event });
      this.resetEvent();  // Reset event input fields
    } else {
      alert('Please fill all event fields');
    }
  }

  // Reset event after adding
  resetEvent() {
    this.event = {
      course: '',
      startTime: '',
      endTime: '',
      lecturer: ''
    };
  }

  // Save the timetable to the database
  async addTimetable() {
    if (!this.newTimetable.faculty || !this.newTimetable.department || !this.newTimetable.year || !this.newTimetable.events.length) {
      console.error('Please complete all fields before submitting the timetable.');
      alert('Please complete all fields.');
      return;
    }

    for (const event of this.newTimetable.events) {
      const timetableEntry = {
        faculty: this.newTimetable.faculty,
        department: this.newTimetable.department,
        year: this.newTimetable.year,
        course: event.course,
        startTime: event.startTime,
        endTime: event.endTime,
        lecturer: event.lecturer
      };

      try {
        await this.firestore.collection('timetables').add(timetableEntry);
      } catch (error) {
        console.error('Error adding timetable entry: ', error);
        alert('Failed to add timetable entry.');
        return;
      }
    }

    alert('Timetable entries added successfully!');
    this.resetTimetable();
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.addTimetable();
    } else {
      alert('Please fill in all the required fields.');
    }
  }

  // Reset the timetable
  resetTimetable() {
    this.newTimetable = {
      faculty: '',
      department: '',
      year: '',
      events: []
    };
  }

}