import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FullCalendarPage } from './full-calendar.page';

describe('FullCalendarPage', () => {
  let component: FullCalendarPage;
  let fixture: ComponentFixture<FullCalendarPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FullCalendarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
