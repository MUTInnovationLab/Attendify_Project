import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeptAnPage } from './dept-an.page';

describe('DeptAnPage', () => {
  let component: DeptAnPage;
  let fixture: ComponentFixture<DeptAnPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DeptAnPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
