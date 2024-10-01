import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentRecordsPage } from './student-records.page';

describe('StudentRecordsPage', () => {
  let component: StudentRecordsPage;
  let fixture: ComponentFixture<StudentRecordsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentRecordsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
