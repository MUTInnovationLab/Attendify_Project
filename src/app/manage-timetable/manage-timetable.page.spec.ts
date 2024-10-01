import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageTimetablePage } from './manage-timetable.page';

describe('ManageTimetablePage', () => {
  let component: ManageTimetablePage;
  let fixture: ComponentFixture<ManageTimetablePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageTimetablePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
