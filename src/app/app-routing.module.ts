import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'attendies',
    loadChildren: () => import('./attendies/attendies.module').then( m => m.AttendiesPageModule)
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then( m => m.AdminPageModule)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then( m => m.DashboardPageModule)
  },
  {
    path: 'dept-add',
    loadChildren: () => import('./dept-add/dept-add.module').then( m => m.DeptAddPageModule)
  },
  {
    path: 'dept-an',
    loadChildren: () => import('./dept-an/dept-an.module').then( m => m.DeptAnPageModule)
  },
  {
    path: 'dept-profile',
    loadChildren: () => import('./dept-profile/dept-profile.module').then( m => m.DeptProfilePageModule)
  },
  {
    path: 'lecture',
    loadChildren: () => import('./lecture/lecture.module').then( m => m.LecturePageModule)
  },
  {
    path: 'profile',
    loadChildren: () => import('./profile/profile.module').then( m => m.ProfilePageModule)
  },
  {
    path: 'qr-scan',
    loadChildren: () => import('./qr-scan/qr-scan.module').then( m => m.QrScanPageModule)
  },
  {
    path: 'reset',
    loadChildren: () => import('./reset/reset.module').then( m => m.ResetPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: 'stude-scan',
    loadChildren: () => import('./stude-scan/stude-scan.module').then( m => m.StudeScanPageModule)
  },
  {
    path: 'student-profile',
    loadChildren: () => import('./student-profile/student-profile.module').then( m => m.StudentProfilePageModule)
  },
  {
    path: 'super-analytics',
    loadChildren: () => import('./super-analytics/super-analytics.module').then( m => m.SuperAnalyticsPageModule)
  },
  
  {
    path: 'view-students',
    loadChildren: () => import('./view-students/view-students.module').then( m => m.ViewStudentsPageModule)
  },
  {
    path: 'component',
    loadChildren: () => import('./component/component.module').then( m => m.ComponentPageModule)
  },
  {
    path: 'manage-announcements',
    loadChildren: () => import('./manage-announcements/manage-announcements.module').then( m => m.ManageAnnouncementsPageModule)
  },
  {
    path: 'calender',
    loadChildren: () => import('./calender/calender.module').then( m => m.CalenderPageModule)
  },
  {
    path: 'event',
    loadChildren: () => import('./event/event.module').then( m => m.EventPageModule)
  },
  {
    path: 'full-calendar',
    loadChildren: () => import('./full-calendar/full-calendar.module').then( m => m.FullCalendarPageModule)
  },

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
