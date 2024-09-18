import { Injectable } from '@angular/core';

interface Student{
  Name: string,
  Surname: string,
  StudentNumber: number,
  Email: string
  }

@Injectable({
  providedIn: 'root'
})


export class StudentService {

  

  constructor() { }
}
