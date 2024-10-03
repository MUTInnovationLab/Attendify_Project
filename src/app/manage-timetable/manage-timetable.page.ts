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

  // ... (keep your existing FACULTIES, DEPARTMENTS, and COURSES constants)
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

  DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  TIME_SLOTS = ['07:45', '09:15', '11:00', '13:00', '14:30'];

  faculties = Object.values(this.FACULTIES);
  departments = [...this.DEPARTMENTS.ENGINEERING, ...this.DEPARTMENTS.MANAGEMENT_SCIENCES, ...this.DEPARTMENTS.NATURAL_SCIENCES];
  years = [1, 2, 3, 4];
  courses: string[] = [];

  modules: string[] = [];

  // Define the type for an event
  eventType: { 
    day: string;
    timeSlot: string;
    module: string; 
    lectureVenue: string; 
    course: string;
  } = {
    day: '',
    timeSlot: '',
    module: '',
    lectureVenue: '',
    course: ''
  };

  // Define the type for the timetable
  timetableType: {
    faculty: string;
    department: string;
    year: string;
    course: string;
    events: { 
      day: string;
      timeSlot: string;
      module: string; 
      lectureVenue: string; 
      course: string;
    }[];
  } = {
    faculty: '',
    department: '',
    year: '',
    course: '',
    events: []
  };

  // New timetable object
  newTimetable: typeof this.timetableType = {
    faculty: '',
    department: '',
    year: '',
    course: '',
    events: []
  };

  // Temporary object for each event (course)
  event: typeof this.eventType = {
    day: '',
    timeSlot: '',
    module: '',
    lectureVenue: '',
    course: ''
  };

  //courses = [...this.COURSES.ENGINEERING, ...this.COURSES.MANAGEMENT_SCIENCES, ...this.COURSES.NATURAL_SCIENCES];

  constructor(private firestore: AngularFirestore, private toastController: ToastController) { }

  ngOnInit() {
    this.fetchModules();
  }

  updateDepartments() {
    const selectedFaculty = this.newTimetable.faculty;
    if (selectedFaculty === this.FACULTIES.ENGINEERING) {
      this.departments = this.DEPARTMENTS.ENGINEERING;
    } else if (selectedFaculty === this.FACULTIES.MANAGEMENT_SCIENCES) {
      this.departments = this.DEPARTMENTS.MANAGEMENT_SCIENCES;
    } else if (selectedFaculty === this.FACULTIES.NATURAL_SCIENCES) {
      this.departments = this.DEPARTMENTS.NATURAL_SCIENCES;
    } else {
      this.departments = [];
    }
    this.newTimetable.department = '';
    this.updateCourses();
  }

  // Update courses based on selected faculty
  updateCourses() {
    const selectedFaculty = this.newTimetable.faculty;
    if (selectedFaculty === this.FACULTIES.ENGINEERING) {
      this.courses = this.COURSES.ENGINEERING;
    } else if (selectedFaculty === this.FACULTIES.MANAGEMENT_SCIENCES) {
      this.courses = this.COURSES.MANAGEMENT_SCIENCES;
    } else if (selectedFaculty === this.FACULTIES.NATURAL_SCIENCES) {
      this.courses = this.COURSES.NATURAL_SCIENCES;
    } else {
      this.courses = [];
    }
    this.newTimetable.course = '';
  }

    // Fetch modules from Firestore
    fetchModules() {
      this.firestore.collection('modules').valueChanges()
        .subscribe((data: any[]) => {
          this.modules = data.map(module => module.moduleCode); // Assuming each module document has a 'name' field
        }, error => {
          console.error('Error fetching modules:', error);
          this.presentToast('Failed to fetch modules.', 'danger');
        });
    }

  // Add the event to the timetable
  addEvent() {
    if (this.event.day && this.event.timeSlot && this.event.module && this.event.lectureVenue && this.event.course) {
      // Check if an event already exists for this day and time slot
      const existingEventIndex = this.newTimetable.events.findIndex(
        e => e.day === this.event.day && e.timeSlot === this.event.timeSlot && e.course === this.event.course
      );

      if (existingEventIndex !== -1) {
        // Replace the existing event
        this.newTimetable.events[existingEventIndex] = { ...this.event };
      } else {
        // Add a new event
        this.newTimetable.events.push({ ...this.event });
      }

      this.resetEvent();  // Reset event input fields
      this.presentToast('Event added to timetable');
    } else {
      this.presentToast('Please fill all event fields', 'warning');
    }
  }

  // Reset event after adding
  resetEvent() {
    this.event = {
      day: '',
      timeSlot: '',
      module: '',
      lectureVenue: '',
      course: ''
    };
  }

  // Save the timetable to the database
  async addTimetable() {
    if (!this.newTimetable.faculty || !this.newTimetable.department || !this.newTimetable.year || !this.newTimetable.events.length) {
      this.presentToast('Please complete all fields before submitting the timetable.', 'warning');
      return;
    }

    try {
      await this.firestore.collection('timetables').add(this.newTimetable);
      this.presentToast('Timetable added successfully!');
      this.resetTimetable();
    } catch (error) {
      console.error('Error adding timetable: ', error);
      this.presentToast('Failed to add timetable.', 'danger');
    }
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.addTimetable();
    } else {
      this.presentToast('Please fill in all the required fields.', 'warning');
    }
  }

  // Reset the timetable
  resetTimetable() {
    this.newTimetable = {
      faculty: '',
      department: '',
      year: '',
      course: '',
      events: []
    };
  }

  async presentToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color
    });
    toast.present();
  }
}