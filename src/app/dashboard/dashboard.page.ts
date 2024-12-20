import { Component, ViewChild } from '@angular/core';
import { IonModal, AlertController, ToastController, NavController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';

interface DeptAdmin {
  id?: string; // Optional ID for internal use
  fullName: string;
  email: string;
  position: string;
  staffNumber: string; // This will be used as the document ID
  department: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
})
export class DashboardPage {
  @ViewChild('addAdminModal') addAdminModal!: IonModal;
  @ViewChild('departmentsAnalyticsModal') departmentsAnalyticsModal!: IonModal;

  currentUser: { name: string; email: string } | null = null;

  deptAdminFullName = '';
  deptAdminEmail = '';
  deptAdminStaffNumber = '';
  deptAdminDepartment = '';
  selectedDeptAdminId: string | null = null;

  deptAdmins$: Observable<DeptAdmin[]>;

  departments: string[] = [
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
    'Public Administration and Economics',
  ];

  constructor(
    private navCtrl: NavController,
    private alertController: AlertController,
    private firestore: AngularFirestore,
    private toastController: ToastController,
    private authService: AuthService,
    private afAuth: AngularFireAuth
  ) {
    this.deptAdmins$ = this.firestore
      .collection<DeptAdmin>('staff', ref => ref.where('position', '==', 'dept-admin'))
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as DeptAdmin;
          const id = a.payload.doc.id;
          return { id, ...data };
        }))
      );
  }

  ngOnInit() {}

  openAddAdminModal() {
    this.addAdminModal.present();
  }

  dismissModal() {
    this.addAdminModal.dismiss();
    this.resetForm();
  }

  async addDeptAdmin() {
    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser) {
      this.presentToast('You must be logged in to add a Dept-Admin.');
      return;
    }

    if (this.deptAdminFullName && this.deptAdminEmail && this.deptAdminStaffNumber && this.deptAdminDepartment) {
      // Check if the email already exists
      const emailExists = await this.firestore
        .collection<DeptAdmin>('staff', ref => ref.where('email', '==', this.deptAdminEmail))
        .valueChanges()
        .pipe(take(1))
        .toPromise()
        .then(deptAdmins => (deptAdmins ?? []).length > 0);

      if (emailExists) {
        this.presentToast('A Dept-Admin with this email already exists.');
        return;
      }

      const newDeptAdmin: DeptAdmin = {
        fullName: this.deptAdminFullName,
        email: this.deptAdminEmail,
        position: 'dept-admin',
        staffNumber: this.deptAdminStaffNumber, // This will be used as the document ID
        department: this.deptAdminDepartment,
      };

      try {
        // Create user in Firebase Authentication
        await this.afAuth.createUserWithEmailAndPassword(this.deptAdminEmail, newDeptAdmin.staffNumber);

        // Add Dept-Admin to Firestore using staffNumber as the document ID
        await this.firestore.collection('staff').doc(newDeptAdmin.staffNumber).set(newDeptAdmin);

        // Optionally, send a password reset email to let the admin set their password
        await this.afAuth.sendPasswordResetEmail(this.deptAdminEmail);

        this.presentToast('Dept-Admin successfully added! A login email has been sent.');
        this.dismissModal();
      } catch (error) {
        console.error('Error adding Dept-Admin: ', error);
        this.presentToast('Error adding Dept-Admin.');
      }
    } else {
      this.presentToast('Please fill out all fields.');
    }
  }

  editDeptAdmin(deptAdmin: DeptAdmin) {
    this.selectedDeptAdminId = deptAdmin.staffNumber; // Use staffNumber as the ID
    this.deptAdminFullName = deptAdmin.fullName;
    this.deptAdminEmail = deptAdmin.email;
    this.deptAdminStaffNumber = deptAdmin.staffNumber;
    this.deptAdminDepartment = deptAdmin.department;
    this.openAddAdminModal();
  }

  async updateDeptAdmin() {
    if (this.selectedDeptAdminId) {
      const updatedDeptAdmin: DeptAdmin = {
        fullName: this.deptAdminFullName,
        email: this.deptAdminEmail,
        position: 'dept-admin',
        staffNumber: this.deptAdminStaffNumber,
        department: this.deptAdminDepartment,
      };
      try {
        await this.firestore.collection('staff').doc(this.selectedDeptAdminId).update(updatedDeptAdmin);
        this.presentToast('Dept-Admin successfully updated!');
        this.dismissModal();
      } catch (error) {
        console.error('Error updating Dept-Admin: ', error);
        this.presentToast('Error updating Dept-Admin.');
      }
    }
  }

  async deleteDeptAdmin(deptAdminId: string) {
    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser) {
      this.presentToast('You must be logged in to delete a Dept-Admin.');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirm Deletion',
      message: 'Are you sure you want to delete this Dept-Admin? This action cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Deletion cancelled');
          }
        }, {
          text: 'Delete',
          cssClass: 'danger',
          handler: async () => {
            try {
              // Use the staffNumber as the document ID for deletion
              await this.firestore.collection('staff').doc(deptAdminId).delete();
              this.presentToast('Dept-Admin successfully deleted!');
            } catch (error) {
              console.error('Error deleting Dept-Admin: ', error);
              this.presentToast('Error deleting Dept-Admin.');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 1500,
      position: 'top'
    });
    toast.present();
  }

  async onSubmit() {
    if (this.selectedDeptAdminId) {
      await this.updateDeptAdmin();
    } else {
      await this.addDeptAdmin();
    }
  }

  resetForm() {
    this.deptAdminFullName = '';
    this.deptAdminEmail = '';
    this.deptAdminStaffNumber = '';
    this.deptAdminDepartment = '';
    this.selectedDeptAdminId = null;
  }

  async presentConfirmationAlert() {
    const alert = await this.alertController.create({
      header: 'Confirm Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Logout',
          handler: () => {
            this.navCtrl.navigateRoot('/login');
          },
        },
      ],
    });
    await alert.present();
  }

  navigateToDeptAnalytics() {
    this.navCtrl.navigateForward('/dept-analytics'); 
  }

  navigateToEvents() {
    this.navCtrl.navigateForward('/event'); 
  }

  nabigateToAddModule() {
    this.navCtrl.navigateForward('/faculty-form'); 
    
  }

  departmentsAnalytics = [
    { name: 'IT', adminCount: 3, activeUsers: 50 },
    { name: 'HR', adminCount: 2, activeUsers: 30 },
    { name: 'Finance', adminCount: 2, activeUsers: 25 },
    { name: 'Marketing', adminCount: 1, activeUsers: 20 },
  ];

  openDepartmentsAnalyticsModal() {
    this.departmentsAnalyticsModal.present();
  }

  dismissDepartmentsAnalyticsModal() {
    this.departmentsAnalyticsModal.dismiss();
  }

  logout() {
    this.navCtrl.navigateRoot('/login');
  }
}
