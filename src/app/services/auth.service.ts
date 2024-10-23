
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<firebase.User | null>;

  constructor(private afAuth: AngularFireAuth, private http: HttpClient) {
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

  signUp(email: string, password: string): Promise<any> {
    return this.afAuth.createUserWithEmailAndPassword(email, password)
      .then((result) => {
        console.log('User successfully registered!', result);
        return result;
      })
      .catch((error) => {
        console.error('Error during registration:', error);
        throw error;
      });
  }

  isAuthenticated(): boolean {
    const currentUser = firebase.auth().currentUser;
    return currentUser !== null;
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    return this.afAuth.sendPasswordResetEmail(email);
  }
}




