import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FacultyDepartmentService {
  // List of faculties
  private faculties: string[] = [
    'Faculty of Management Science',
    'Faculty of Engineering',
    'Faculty of Applied and Health Science',
  ];

  

  // Map faculties to their respective departments
  private facultyDepartments: { [key: string]: string[] } = {
    'Faculty of Management Science': [
      'Accounting and Law',
      'Human Resource Management',
      'Marketing',
      'Office Mangement and Technology',
      'Public Administration and Economics',
    ],
    'Faculty of Engineering': [
      'Civil Engineering and Survey',
      'Electrical Engineering',
      'Mechanical Engineering',
      'Chemical Engineering',
      'Building and Construction',
    ],
    'Faculty of Applied and Health Science': [
      'Agriculture',
      'Biomedical Sciences',
      'Chemistry',
      'Community Extension',
      'Environmental Health',
      'Information and Communication Technology',
      'Nature Conservation',
    ],
  };

  constructor() {}




  
  // Get all faculties
  getFaculties(): string[] {
    return this.faculties;
  }

  // Get departments based on a selected faculty
  getDepartments(facultyName: string): string[] {
    return this.facultyDepartments[facultyName] || [];
  }



  
}
