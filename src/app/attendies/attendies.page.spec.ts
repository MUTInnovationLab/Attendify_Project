import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendiesPage } from './attendies.page';

describe('AttendiesPage', () => {
  let component: AttendiesPage;
  let fixture: ComponentFixture<AttendiesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AttendiesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
