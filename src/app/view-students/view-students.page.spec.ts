import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewStudentsPage } from './view-students.page';

describe('ViewStudentsPage', () => {
  let component: ViewStudentsPage;
  let fixture: ComponentFixture<ViewStudentsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewStudentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
