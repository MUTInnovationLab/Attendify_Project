import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudeScanPage } from './stude-scan.page';

describe('StudeScanPage', () => {
  let component: StudeScanPage;
  let fixture: ComponentFixture<StudeScanPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StudeScanPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
