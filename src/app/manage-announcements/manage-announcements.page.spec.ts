import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageAnnouncementsPage } from './manage-announcements.page';

describe('ManageAnnouncementsPage', () => {
  let component: ManageAnnouncementsPage;
  let fixture: ComponentFixture<ManageAnnouncementsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageAnnouncementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
