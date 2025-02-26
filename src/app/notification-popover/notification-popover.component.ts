import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-notification-popover',
  templateUrl: './notification-popover.component.html',
  styleUrls: ['./notification-popover.component.scss'],
})
export class NotificationPopoverComponent  implements OnInit {
  @Input() notifications: string[] = [];

  constructor() { }

  ngOnInit() {}

}
