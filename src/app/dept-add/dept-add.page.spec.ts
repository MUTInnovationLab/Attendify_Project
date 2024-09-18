import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeptAddPage } from './dept-add.page';

describe('DeptAddPage', () => {
  let component: DeptAddPage;
  let fixture: ComponentFixture<DeptAddPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DeptAddPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
