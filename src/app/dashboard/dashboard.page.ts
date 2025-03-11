import { Component, ViewChild } from '@angular/core';
import { IonModal, AlertController, ToastController, NavController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';

interface DeptAdmin {
  email: string;
  faculty: string;
  fullName: string;
  position: string;
  staffNumber: string;
}

interface HOD extends DeptAdmin {
  department: string;
}

interface Department {
  name: string;
  // Add other department fields if needed
}

interface FacultyDocument {
  departments: Department[];
  // Add other faculty properties if needed
}

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
})
export class DashboardPage {
  @ViewChild('addAdminModal') addAdminModal!: IonModal;
  @ViewChild('departmentsAnalyticsModal') departmentsAnalyticsModal!: IonModal;
  @ViewChild('addHODModal') addHODModal!: IonModal;

  currentUser: { 
    name: string; 
    email: string;
    position: string;
  } | null = null;

  isSuperAdmin: boolean = false;
  isDean: boolean = false;

  hodFullName: string = '';
  hodEmail: string = '';
  hodStaffNumber: string = '';
  hodFaculty: string = '';
  hodDepartment: string = '';
  selectedHODId: string | null = null;

  deptAdminFullName: string = '';
  deptAdminEmail: string = '';
  deptAdminStaffNumber: string = '';
  deptAdminFaculty: string = '';
  selectedDeptAdminId: string | null = null;

  deptAdmins$: Observable<DeptAdmin[]>;
  faculties: string[] = [];
  departments: string[] = [];

  private roleFeatures: {
    [key: string]: string[];
  } = {
    'super-admin': ['department-admins', 'departments-analytics', 'calendar', 'add-admin', 'add-hod', 'faculty-form'],
    'Dean': ['departments-analytics']
  };

  constructor(
    private navCtrl: NavController,
    private alertController: AlertController,
    private firestore: AngularFirestore,
    private toastController: ToastController,
    private authService: AuthService,
    private afAuth: AngularFireAuth
  ) {
    this.deptAdmins$ = this.firestore
      .collection<DeptAdmin>('staff', ref => ref.where('position', '==', 'super-admin'))
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as DeptAdmin;
          const id = a.payload.doc.id;
          return { id, ...data };
        }))
      );

    this.afAuth.authState.subscribe(user => {
      if (user) {
        this.checkUserRole();
        this.loadFaculties();
      }
    });
  }

  async loadFaculties() {
    try {
      const facultiesSnapshot = await this.firestore
        .collection('faculties')
        .get()
        .toPromise();

      if (facultiesSnapshot) {
        this.faculties = facultiesSnapshot.docs.map(doc => doc.id);
      }
    } catch (error) {
      console.error('Error loading faculties:', error);
      this.presentToast('Error loading faculties.');
    }
  }

  async loadDepartments() {
    if (!this.hodFaculty) {
      this.departments = [];
      return;
    }
  
    try {
      // Get the faculty document with proper typing
      const facultyDoc = await this.firestore
        .collection('faculties')
        .doc<FacultyDocument>(this.hodFaculty)
        .get()
        .toPromise();
  
      if (facultyDoc?.exists) {
        const data = facultyDoc.data();
        if (data && data.departments) {
          // Now TypeScript knows that departments is an array of Department objects
          this.departments = data.departments.map(dept => dept.name);
        }
      }
  
      console.log('Loaded departments:', this.departments);
    } catch (error) {
      console.error('Error loading departments:', error);
      this.presentToast('Error loading departments.');
    }
  }

  async checkUserRole() {
    console.log('Checking user role...'); // Debug log
    const user = await this.authService.getCurrentUser();
    console.log('Current user:', user); // Debug log
    
    if (user) {
      this.currentUser = {
        name: user.fullName || '',
        email: user.email || '',
        position: user.position || ''
      };
  
      this.isSuperAdmin = user.role === 'super-admin';
      this.isDean = user.role === 'Dean';
      
      console.log('isSuperAdmin:', this.isSuperAdmin); // Debug log
      console.log('isDean:', this.isDean); // Debug log
    } else {
      console.log('No user found'); // Debug log
    }
  }

  // private roleFeatures = {
  //   'super-admin': ['department-admins', 'departments-analytics', 'calendar', 'add-admin', 'faculty-form'],
  //   'Dean': ['departments-analytics', 'add-admin']
  // };

  hasAccess(feature: string): boolean {
    if (!this.currentUser?.position) return false;
    
    const allowedFeatures = this.roleFeatures[this.currentUser.position as keyof typeof this.roleFeatures] || [];
    return allowedFeatures.includes(feature);
  }

  ngOnInit() {
    this.checkUserRole();
  }

  openAddAdminModal() {
    this.addAdminModal.present();
  }

  dismissModal() {
    this.addAdminModal.dismiss();
    this.resetForm();
  }

  async addDeptAdmin() {
    if (!this.hasAccess('add-admin')) {
      this.presentToast('You do not have permission to add administrators.');
      return;
    }

    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser) {
      this.presentToast('You must be logged in to add a Dean.');
      return;
    }

    if (this.deptAdminFullName && this.deptAdminEmail && this.deptAdminStaffNumber && this.deptAdminFaculty) {
      // Check if staff number already exists
      const staffNumberExists = await this.firestore
        .collection<DeptAdmin>('staff')
        .doc(this.deptAdminStaffNumber)
        .get()
        .toPromise()
        .then(doc => doc?.exists);

      if (staffNumberExists) {
        this.presentToast('A Dean with this staff number already exists.');
        return;
      }

      // Check if email is already in use
      const emailExists = await this.firestore
        .collection<DeptAdmin>('staff', ref => ref.where('email', '==', this.deptAdminEmail))
        .get()
        .toPromise()
        .then(snapshot => !snapshot?.empty);

      if (emailExists) {
        this.presentToast('A Dean with this email already exists.');
        return;
      }

      // Structure matching the Firebase screenshot
      const newDean = {
        email: this.deptAdminEmail,
        faculty: this.deptAdminFaculty,
        fullName: this.deptAdminFullName,
        position: "Dean",
        staffNumber: this.deptAdminStaffNumber
      };

      try {
        // Create auth user with email and staff number as password
        await this.afAuth.createUserWithEmailAndPassword(this.deptAdminEmail, this.deptAdminStaffNumber);
        
        // Add to Firestore using staffNumber as document ID
        await this.firestore.collection('staff').doc(this.deptAdminStaffNumber).set(newDean);
        
        // Send password reset email
        await this.afAuth.sendPasswordResetEmail(this.deptAdminEmail);

        this.presentToast('Dean successfully added! A password reset email has been sent.');
        this.dismissModal();
      } catch (error) {
        console.error('Error adding Dean:', error);
        this.presentToast('Error adding Dean.');
      }
    } else {
      this.presentToast('Please fill out all fields.');
    }
  }


  editDeptAdmin(deptAdmin: DeptAdmin) {
    if (!this.hasAccess('add-admin')) {
      this.presentToast('You do not have permission to edit administrators.');
      return;
    }

    this.selectedDeptAdminId = deptAdmin.email; // Changed from staffNumber to email
    this.deptAdminFullName = deptAdmin.fullName;
    this.deptAdminEmail = deptAdmin.email;
    this.deptAdminStaffNumber = deptAdmin.staffNumber;
    this.deptAdminFaculty = deptAdmin.faculty;
    this.openAddAdminModal();
  }

  async updateDeptAdmin() {
    if (!this.hasAccess('add-admin')) {
      this.presentToast('You do not have permission to update administrators.');
      return;
    }

    if (this.selectedDeptAdminId) {
      const updatedDeptAdmin: DeptAdmin = {
        fullName: this.deptAdminFullName,
        email: this.deptAdminEmail,
        position: 'super-admin',
        staffNumber: this.deptAdminStaffNumber,
        faculty: this.deptAdminFaculty,
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

  async deleteDeptAdmin(staffNumber: string) {
    if (!this.hasAccess('add-admin')) {
      this.presentToast('You do not have permission to delete administrators.');
      return;
    }

    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser) {
      this.presentToast('You must be logged in to delete a Dean.');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirm Deletion',
      message: 'Are you sure you want to delete this Dean? This action cannot be undone.',
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
              // Get the dean's data first to get their email
              const deanDoc = await this.firestore.collection('staff').doc(staffNumber).get().toPromise();
              const deanData = deanDoc?.data() as DeptAdmin;
              
              if (deanData) {
                // Delete from Authentication using email
                const user = await this.afAuth.fetchSignInMethodsForEmail(deanData.email);
                if (user.length > 0) {
                  const userRecord = await this.afAuth.currentUser;
                  if (userRecord) {
                    await userRecord.delete();
                  }
                }
              }
              
              // Delete from Firestore using staffNumber
              await this.firestore.collection('staff').doc(staffNumber).delete();
              this.presentToast('Dean successfully deleted!');
            } catch (error) {
              console.error('Error deleting Dean: ', error);
              this.presentToast('Error deleting Dean.');
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
    this.deptAdminFaculty = '';
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
            this.logout();
          },
        },
      ],
    });
    await alert.present();
  }

  navigateToDeptAnalytics() {
    if (!this.hasAccess('departments-analytics')) {
      this.presentToast('You do not have permission to access department analytics.');
      return;
    }
    this.navCtrl.navigateForward('/dept-an');
  }

  navigateToEvents() {
    if (!this.hasAccess('calendar')) {
      this.presentToast('You do not have permission to access the calendar.');
      return;
    }
    this.navCtrl.navigateForward('/event');
  }

  navigateToAddModule() {
    if (!this.hasAccess('faculty-form')) {
      this.presentToast('You do not have permission to access the faculty form.');
      return;
    }
    this.navCtrl.navigateForward('/faculty-form');
  }

  openDepartmentsAnalyticsModal() {
    if (!this.hasAccess('departments-analytics')) {
      this.presentToast('You do not have permission to view department analytics.');
      return;
    }
    this.departmentsAnalyticsModal.present();
  }

  dismissDepartmentsAnalyticsModal() {
    this.departmentsAnalyticsModal.dismiss();
  }

  openAddHODModal() {
    this.addHODModal.present();
  }
  
  dismissHODModal() {
    this.addHODModal.dismiss();
    this.resetHODForm();
  }
  
  resetHODForm() {
    this.hodFullName = '';
    this.hodEmail = '';
    this.hodStaffNumber = '';
    this.hodFaculty = '';
    this.hodDepartment = '';
    this.selectedHODId = null;
  }
  
  async addHOD() {
    if (!this.hasAccess('add-hod')) {
      this.presentToast('You do not have permission to add HODs.');
      return;
    }
  
    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser) {
      this.presentToast('You must be logged in to add an HOD.');
      return;
    }
  
    if (this.hodFullName && this.hodEmail && this.hodStaffNumber && this.hodFaculty && this.hodDepartment) {
      // Check if staff number already exists
      const staffNumberExists = await this.firestore
        .collection<HOD>('staff')
        .doc(this.hodStaffNumber)
        .get()
        .toPromise()
        .then(doc => doc?.exists);
  
      if (staffNumberExists) {
        this.presentToast('An HOD with this staff number already exists.');
        return;
      }
  
      // Check if email is already in use
      const emailExists = await this.firestore
        .collection<HOD>('staff', ref => ref.where('email', '==', this.hodEmail))
        .get()
        .toPromise()
        .then(snapshot => !snapshot?.empty);
  
      if (emailExists) {
        this.presentToast('An HOD with this email already exists.');
        return;
      }
  
      const newHOD = {
        email: this.hodEmail,
        faculty: this.hodFaculty,
        department: this.hodDepartment,
        fullName: this.hodFullName,
        position: "HOD",
        staffNumber: this.hodStaffNumber
      };
  
      try {
        // Create auth user with email and staff number as password
        await this.afAuth.createUserWithEmailAndPassword(this.hodEmail, this.hodStaffNumber);
        
        // Add to Firestore using staffNumber as document ID
        await this.firestore.collection('staff').doc(this.hodStaffNumber).set(newHOD);
        
        // Send password reset email
        await this.afAuth.sendPasswordResetEmail(this.hodEmail);
  
        this.presentToast('HOD successfully added! A password reset email has been sent.');
        this.dismissHODModal();
      } catch (error) {
        console.error('Error adding HOD:', error);
        this.presentToast('Error adding HOD.');
      }
    } else {
      this.presentToast('Please fill out all fields.');
    }
  }
  
  async onHODSubmit() {
    if (this.selectedHODId) {
      await this.updateHOD();
    } else {
      await this.addHOD();
    }
  }
  
  async updateHOD() {
    if (!this.hasAccess('add-hod')) {
      this.presentToast('You do not have permission to update HODs.');
      return;
    }
  
    if (this.selectedHODId) {
      const updatedHOD: HOD = {
        fullName: this.hodFullName,
        email: this.hodEmail,
        position: 'HOD',
        staffNumber: this.hodStaffNumber,
        faculty: this.hodFaculty,
        department: this.hodDepartment
      };
      try {
        await this.firestore.collection('staff').doc(this.selectedHODId).update(updatedHOD);
        this.presentToast('HOD successfully updated!');
        this.dismissHODModal();
      } catch (error) {
        console.error('Error updating HOD: ', error);
        this.presentToast('Error updating HOD.');
      }
    }
  }

  async logout() {
    try {
      await this.authService.signOut();
      this.navCtrl.navigateRoot('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      this.presentToast('Error during logout. Please try again.');
    }
  }
}


