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
    path: 'calender',
    loadChildren: () => import('./calender/calender.module').then( m => m.CalenderPageModule)
  },
  {
    path: 'event',
    loadChildren: () => import('./event/event.module').then( m => m.EventPageModule)
  },
 
  {
    path: 'dept-analytics',
    loadChildren: () => import('./dept-analytics/dept-analytics.module').then( m => m.DeptAnalyticsPageModule)
  },
  {
    path: 'hod-analytics',
    loadChildren: () => import('./hod-analytics/hod-analytics.module').then( m => m.HodAnalyticsPageModule)
  },
  {
    path: 'student-records',
    loadChildren: () => import('./student-records/student-records.module').then( m => m.StudentRecordsPageModule)
  },
  {
    path: 'scan',
    loadChildren: () => import('./scan/scan.module').then( m => m.ScanPageModule)
  },
  {
    path: 'scanner',
    loadChildren: () => import('./scanner/scanner.module').then( m => m.ScannerPageModule)
  },
  {
    path: 'manage-timetable',
    loadChildren: () => import('./manage-timetable/manage-timetable.module').then( m => m.ManageTimetablePageModule)
  },
  {
    path: 'board',
    loadChildren: () => import('./board/board.module').then( m => m.BoardPageModule)
  },
  {
    path: 'faculty-form',
    loadChildren: () => import('./faculty-form/faculty-form.module').then( m => m.FacultyFormPageModule)
  },
  {
    path: 'super-admin',
    loadChildren: () => import('./super-admin/super-admin.module').then( m => m.SuperAdminPageModule)
  }

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
