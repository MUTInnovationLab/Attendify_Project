import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { PopoverController } from '@ionic/angular';

@Component({
  selector: 'app-non-attended-students',
  templateUrl: './non-attended-students.component.html',
  styleUrls: ['./non-attended-students.component.scss'],
})
export class NonAttendedStudentsComponent implements OnInit {
  @Input() students!: { studentNumber: string }[];
  @Input() date!: string; // Add date input
  @Output() markAsAttendee = new EventEmitter<{ studentNumber: string }>();


  constructor(private popoverController: PopoverController) { }

  ngOnInit() {}

  dismiss() {
    this.popoverController.dismiss();
  }

  markStudentAsAttendee(student: { studentNumber: string }) {
    this.markAsAttendee.emit(student);
    //this.dismiss();
  }
}
