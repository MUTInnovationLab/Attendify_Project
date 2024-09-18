import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeptProfilePage } from './dept-profile.page';

describe('DeptProfilePage', () => {
  let component: DeptProfilePage;
  let fixture: ComponentFixture<DeptProfilePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DeptProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
