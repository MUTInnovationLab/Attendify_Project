import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { environment } from '../environments/environment';
import { ViewModalModule } from './view-modal/view-modal.module';

import { MakeAnnouncementModule } from './make-announcement/make-announcement.module'; // Import the MakeAnnouncementModule
import { AnnouncementsModule } from './view-announcements/view-announcements.module';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

import { NotificationPopoverComponent } from './notification-popover/notification-popover.component';
import { NonAttendedStudentsComponent } from './components/non-attended-students/non-attended-students.component';


@NgModule({
  declarations: [
    AppComponent,
    NotificationPopoverComponent,
    NonAttendedStudentsComponent
  ],
  imports: [
    BrowserModule, 
    FormsModule, 
    AngularFirestoreModule, 
    ZXingScannerModule,
    
    IonicModule.forRoot(), 
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    
    AngularFirestoreModule,
    AngularFireAuthModule,
    AnnouncementsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MakeAnnouncementModule // Include MakeAnnouncementModule in the imports array
   
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}




