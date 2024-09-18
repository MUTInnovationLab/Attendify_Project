import { TestBed } from '@angular/core/testing';

import { AcademicCalendarService } from './academic-calendar.service';

describe('AcademicCalendarService', () => {
  let service: AcademicCalendarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AcademicCalendarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
