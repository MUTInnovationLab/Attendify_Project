import { Component, ViewChild } from '@angular/core';
import { IonModal, AlertController, ToastController, NavController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';

interface DeptAdmin {
  id?: string;
  fullName: string;
  email: string;
  position: string;
  staffNumber: string;
  department: string;
  faculty: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
})
export class DashboardPage {
  @ViewChild('addAdminModal') addAdminModal!: IonModal;
  @ViewChild('departmentsAnalyticsModal') departmentsAnalyticsModal!: IonModal;
  @ViewChild('addDeanModal') addDeanModal!: IonModal;

  currentUser: { name: string; email: string } | null = null;
  deptAdminFullName = '';
  deptAdminEmail = '';
  deptAdminStaffNumber = '';
  deptAdminDepartment = '';
  selectedDeptAdminId: string | null = null;
  selectedFaculty: string = '';

  deptAdmins$: Observable<DeptAdmin[]>;
  faculties: string[] = [];
  availableDepartments: string[] = [];

  constructor(
    private navCtrl: NavController,
    private alertController: AlertController,
    private firestore: AngularFirestore,
    private toastController: ToastController,
    private authService: AuthService,
    private afAuth: AngularFireAuth
  ) {
    this.deptAdmins$ = this.firestore
      .collection<DeptAdmin>('staff', ref => ref.where('position', '==', 'HOD'))
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as DeptAdmin;
          const id = a.payload.doc.id;
          return { id, ...data };
        }))
      );
    
    this.loadFaculties();
  }

  async loadFaculties() {
    const facultiesSnapshot = await this.firestore.collection('specified-collection-name').get().toPromise();
    this.faculties = facultiesSnapshot?.docs.map(doc => doc.id) || [];
  }

  async onFacultyChange(event: any) {
    const selectedFaculty = event.detail.value;
    this.selectedFaculty = selectedFaculty;
    
    if (selectedFaculty) {
      const facultyDoc = await this.firestore.collection('faculties').doc(selectedFaculty).get().toPromise();
      const departments = (facultyDoc?.data() as any)?.departments || [];
      this.availableDepartments = departments.map((dept: any) => dept.name);
    } else {
      this.availableDepartments = [];
    }
    
    this.deptAdminDepartment = '';
  }

  openAddHODModal() {
    this.resetForm();
    this.addAdminModal.present();
  }

  openAddDeanModal() {
    this.resetForm();
    this.addDeanModal.present();
  }

  dismissModal() {
    this.addAdminModal?.dismiss();
    this.addDeanModal?.dismiss();
    this.resetForm();
  }

  async addDeptAdmin() {
    if (!this.selectedFaculty) {
      this.presentToast('Please select a faculty.');
      return;
    }

    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser) {
      this.presentToast('You must be logged in to add a HOD.');
      return;
    }

    if (!this.deptAdminFullName || !this.deptAdminEmail || !this.deptAdminStaffNumber || 
        !this.deptAdminDepartment || !this.selectedFaculty) {
      this.presentToast('Please fill out all required fields.');
      return;
    }

    const emailExists = await this.firestore
      .collection<DeptAdmin>('staff', ref => ref.where('email', '==', this.deptAdminEmail))
      .valueChanges()
      .pipe(take(1))
      .toPromise()
      .then(deptAdmins => (deptAdmins ?? []).length > 0);

    if (emailExists) {
      this.presentToast('A HOD with this email already exists.');
      return;
    }

    const newDeptAdmin: DeptAdmin = {
      fullName: this.deptAdminFullName,
      email: this.deptAdminEmail,
      position: 'HOD',
      staffNumber: this.deptAdminStaffNumber,
      department: this.deptAdminDepartment,
      faculty: this.selectedFaculty
    };

    try {
      await this.afAuth.createUserWithEmailAndPassword(this.deptAdminEmail, newDeptAdmin.staffNumber);
      await this.firestore.collection('staff').doc(newDeptAdmin.staffNumber).set(newDeptAdmin);
      await this.afAuth.sendPasswordResetEmail(this.deptAdminEmail);
      
      this.presentToast('HOD successfully added! A login email has been sent.');
      this.dismissModal();
    } catch (error) {
      console.error('Error adding HOD: ', error);
      this.presentToast('Error adding HOD.');
    }
  }

  async addDean() {
    if (!this.selectedFaculty) {
      this.presentToast('Please select a faculty.');
      return;
    }

    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser) {
      this.presentToast('You must be logged in to add a Dean.');
      return;
    }

    if (!this.deptAdminFullName || !this.deptAdminEmail || !this.deptAdminStaffNumber || !this.selectedFaculty) {
      this.presentToast('Please fill out all required fields.');
      return;
    }

    const emailExists = await this.firestore
      .collection<DeptAdmin>('staff', ref => ref.where('email', '==', this.deptAdminEmail))
      .valueChanges()
      .pipe(take(1))
      .toPromise()
      .then(deptAdmins => (deptAdmins ?? []).length > 0);

    if (emailExists) {
      this.presentToast('A Dean with this email already exists.');
      return;
    }

    const newDean: DeptAdmin = {
      fullName: this.deptAdminFullName,
      email: this.deptAdminEmail,
      position: 'Dean',
      staffNumber: this.deptAdminStaffNumber,
      department: '', // No department for Dean
      faculty: this.selectedFaculty
    };

    try {
      await this.afAuth.createUserWithEmailAndPassword(this.deptAdminEmail, newDean.staffNumber);
      await this.firestore.collection('staff').doc(newDean.staffNumber).set(newDean);
      await this.afAuth.sendPasswordResetEmail(this.deptAdminEmail);
      
      this.presentToast('Dean successfully added! A login email has been sent.');
      this.dismissModal();
    } catch (error) {
      console.error('Error adding Dean: ', error);
      this.presentToast('Error adding Dean.');
    }
  }

  editDeptAdmin(deptAdmin: DeptAdmin) {
    this.selectedDeptAdminId = deptAdmin.staffNumber;
    this.deptAdminFullName = deptAdmin.fullName;
    this.deptAdminEmail = deptAdmin.email;
    this.deptAdminStaffNumber = deptAdmin.staffNumber;
    this.deptAdminDepartment = deptAdmin.department;
    this.selectedFaculty = deptAdmin.faculty;
    
    if (deptAdmin.position === 'Dean') {
      this.openAddDeanModal();
    } else {
      this.openAddHODModal();
    }
  }

  async updateDeptAdmin() {
    if (!this.selectedFaculty) {
      this.presentToast('Please select a faculty.');
      return;
    }

    if (this.selectedDeptAdminId) {
      const updatedDeptAdmin: DeptAdmin = {
        fullName: this.deptAdminFullName,
        email: this.deptAdminEmail,
        position: this.addDeanModal.isOpen ? 'Dean' : 'HOD',
        staffNumber: this.deptAdminStaffNumber,
        department: this.addDeanModal.isOpen ? '' : this.deptAdminDepartment,
        faculty: this.selectedFaculty
      };
      
      try {
        await this.firestore.collection('staff').doc(this.selectedDeptAdminId).update(updatedDeptAdmin);
        this.presentToast(`${updatedDeptAdmin.position} successfully updated!`);
        this.dismissModal();
      } catch (error) {
        console.error(`Error updating ${updatedDeptAdmin.position}: `, error);
        this.presentToast(`Error updating ${updatedDeptAdmin.position}.`);
      }
    }
  }

  async deleteDeptAdmin(deptAdminId: string) {
    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser) {
      this.presentToast('You must be logged in to delete a staff member.');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirm Deletion',
      message: 'Are you sure you want to delete this staff member? This action cannot be undone.',
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
              await this.firestore.collection('staff').doc(deptAdminId).delete();
              this.presentToast('Staff member successfully deleted!');
            } catch (error) {
              console.error('Error deleting staff member: ', error);
              this.presentToast('Error deleting staff member.');
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
      duration: 2000,
      position: 'top'
    });
    toast.present();
  }

  async onSubmit() {
    if (this.selectedDeptAdminId) {
      await this.updateDeptAdmin();
    } else {
      if (this.addDeanModal.isOpen) {
        await this.addDean();
      } else {
        await this.addDeptAdmin();
      }
    }
  }

  resetForm() {
    this.deptAdminFullName = '';
    this.deptAdminEmail = '';
    this.deptAdminStaffNumber = '';
    this.deptAdminDepartment = '';
    this.selectedFaculty = '';
    this.selectedDeptAdminId = null;
    this.availableDepartments = [];
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
            this.logout();
          },
        },
      ],
    });
    await alert.present();
  }

  navigateToDeptAnalytics() {
    this.navCtrl.navigateForward('/super-admin');
  }

  navigateToEvents() {
    this.navCtrl.navigateForward('/event');
  }

  nabigateToAddModule() {
    this.navCtrl.navigateForward('/faculty-form');
  }

  openDepartmentsAnalyticsModal() {
    this.departmentsAnalyticsModal.present();
  }

  dismissDepartmentsAnalyticsModal() {
    this.departmentsAnalyticsModal.dismiss();
  }

  async logout() {
    try {
      await this.authService.logout();
      this.navCtrl.navigateRoot('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      this.presentToast('Error during logout. Please try again.');
    }
  }
}