import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {

  private departments: string[] = [
    'Agriculture',
    'Biomedical Sciences',
    'Building and Construction',
    'Chemistry',
    'Civil Engineering',
    'Civil Engineering and Survey',
    'Community Extension',
    'Electrical Engineering',
    'Environmental Health',
    'Human Resource Management',
    'Marketing',
    'Mechanical Engineering',
    'Nature Conservation',
    'Office Management and Technology',
    'Public Administration and Economics'
  ];

  constructor() { }

  getDepartments(): string[] {
    return this.departments;
  }
}
