import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimetableViewPage } from './timetable-view.page';

describe('TimetableViewPage', () => {
  let component: TimetableViewPage;
  let fixture: ComponentFixture<TimetableViewPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TimetableViewPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
