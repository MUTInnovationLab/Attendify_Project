import { Component, OnInit, Input } from '@angular/core';
import { PopoverController } from '@ionic/angular';

@Component({
  selector: 'app-non-attended-students',
  templateUrl: './non-attended-students.component.html',
  styleUrls: ['./non-attended-students.component.scss'],
})
export class NonAttendedStudentsComponent implements OnInit {
  @Input() students!: { studentNumber: string }[];

  constructor(private popoverController: PopoverController) { }

  ngOnInit() {}

  dismiss() {
    this.popoverController.dismiss();
  }
}
