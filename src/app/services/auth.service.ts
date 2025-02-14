import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import { Observable, firstValueFrom } from 'rxjs';

interface UserData {
  uid?: string;
  role?: string;
  department?: string;
  faculty?: string;
  fullName?: string;
  email: string | null;
  position?: string;
  staffNumber?: string;
}

interface Department {
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<firebase.User | null>;

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
  ) {
    this.user$ = this.afAuth.authState;
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await this.afAuth.sendPasswordResetEmail(email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const credential = await this.afAuth.signInWithEmailAndPassword(email, password);
      console.log('Login successful:', credential.user?.email);
      
      const staffDoc = await this.firestore
        .collection('staff')
        .doc(email)
        .get()
        .toPromise();
        
      console.log('Staff document exists:', staffDoc?.exists);
      
      if (!staffDoc?.exists) {
        throw new Error('User not found in staff collection');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<UserData | null> {
    try {
      const user = await this.afAuth.currentUser;
      
      if (user) {
        const userDocByEmail = await this.firestore
          .collection('staff')
          .doc(user.email || '')
          .get()
          .toPromise();

        if (userDocByEmail && userDocByEmail.exists) {
          const userData = userDocByEmail.data() as UserData;
          return {
            ...userData,
            role: userData.position?.toLowerCase()
          };
        }

        const querySnapshot = await this.firestore
          .collection<UserData>('staff')
          .ref
          .where('email', '==', user.email)
          .get();

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data() as UserData;
          return {
            ...userData,
            role: userData.position?.toLowerCase()
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async getDepartmentsForFaculty(facultyName: string): Promise<string[]> {
    try {
      const facultyDoc = await this.firestore
        .collection('faculties')
        .doc(facultyName)
        .collection('departments')
        .get()
        .toPromise();

      if (facultyDoc) {
        return facultyDoc.docs.map(doc => {
          const data = doc.data() as Department;
          return data['name'];
        });
      }
      
      return [];
    } catch (error) {
      console.error('Error getting departments:', error);
      return [];
    }
  }

  getStaffByFaculty(facultyName: string): Observable<UserData[]> {
    return this.firestore
      .collection<UserData>('staff', ref => 
        ref.where('faculty', '==', facultyName)
      )
      .valueChanges();
  }

  getStaffByDepartment(departmentName: string): Observable<UserData[]> {
    return this.firestore
      .collection<UserData>('staff', ref => 
        ref.where('department', '==', departmentName)
      )
      .valueChanges();
  }

  getStudentsByFaculty(facultyName: string): Observable<any[]> {
    return this.firestore
      .collection('students', ref => 
        ref.where('faculty', '==', facultyName)
      )
      .valueChanges();
  }

  getStudentsByDepartment(departmentName: string): Observable<any[]> {
    return this.firestore
      .collection('students', ref => 
        ref.where('department', '==', departmentName)
      )
      .valueChanges();
  }

  async getUserByEmail(email: string): Promise<UserData | null> {
    try {
      const querySnapshot = await this.firestore
        .collection<UserData>('staff')
        .ref
        .where('email', '==', email)
        .get();

      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as UserData;
      }

      return null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async createUserInFirestore(userData: UserData): Promise<void> {
    try {
      await this.firestore
        .collection('staff')
        .doc(userData.email || '')
        .set(userData);
    } catch (error) {
      console.error('Error creating user in Firestore:', error);
      throw error;
    }
  }

  async updateUserInFirestore(email: string, userData: Partial<UserData>): Promise<void> {
    try {
      await this.firestore
        .collection('staff')
        .doc(email)
        .update(userData);
    } catch (error) {
      console.error('Error updating user in Firestore:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.afAuth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.afAuth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async getCurrentUserEmail(): Promise<string | null> {
    const user = await this.afAuth.currentUser;
    return user ? user.email : null;
  }

  isAuthenticated(): boolean {
    return firebase.auth().currentUser !== null;
  }

  async hasRole(requiredRole: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === requiredRole;
  }

  async isInDepartment(requiredDepartment: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.department === requiredDepartment;
  }

  getDepartmentUsers(department: string): Observable<UserData[]> {
    return this.firestore
      .collection<UserData>('staff', ref => 
        ref.where('department', '==', department)
      )
      .valueChanges();
  }

  getUsersByRole(role: string): Observable<UserData[]> {
    return this.firestore
      .collection<UserData>('staff', ref => 
        ref.where('position', '==', role)
      )
      .valueChanges();
  }
}