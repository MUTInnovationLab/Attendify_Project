// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  [x: string]: any;
  user$: Observable<firebase.User | null>;

  constructor(private afAuth: AngularFireAuth) {
    this.user$ = this.afAuth.authState;
   
  }

  async login(email: string, password: string): Promise<void> {
    await this.afAuth.signInWithEmailAndPassword(email, password);
  }

  async logout(): Promise<void> {
    await this.afAuth.signOut();
  }

  getCurrentUser(): Promise<firebase.User | null> {
    return this.afAuth.currentUser;
  }
   
  
 
  

  async getCurrentUserEmail(): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user ? user.email : null;
  }

 

  // Method to register a user with email and password
  signUp(email: string, password: string): Promise<any> {
    return this.afAuth.createUserWithEmailAndPassword(email, password)
      .then((result) => {
        console.log('User successfully registered!', result);
        // You can add more user handling logic here (e.g., saving user data to Firestore)
        return result;
      })
      .catch((error) => {
        console.error('Error during registration:', error);
        throw error; // Re-throw the error to handle it in the calling function
      });
  }


    // Add the isAuthenticated method
    isAuthenticated(): boolean {
      // Check if there's a user signed in
      const currentUser = firebase.auth().currentUser;
      return currentUser !== null;
    }
}
