import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HodAnalyticsPage } from './hod-analytics.page';

describe('HodAnalyticsPage', () => {
  let component: HodAnalyticsPage;
  let fixture: ComponentFixture<HodAnalyticsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HodAnalyticsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
