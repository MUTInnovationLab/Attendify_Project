import { TestBed } from '@angular/core/testing';

import { FacultyDepartmentService } from './faculty-department.service';

describe('FacultyDepartmentService', () => {
  let service: FacultyDepartmentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacultyDepartmentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
