import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeptAnalyticsPage } from './dept-analytics.page';

describe('DeptAnalyticsPage', () => {
  let component: DeptAnalyticsPage;
  let fixture: ComponentFixture<DeptAnalyticsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DeptAnalyticsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
