import { Component, OnInit } from '@angular/core';
import { NavController, LoadingController, AlertController, ToastController, ModalController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { MakeAnnouncementComponent } from '../make-announcement/make-announcement.component';

@Component({
  selector: 'app-lecture',
  templateUrl: './lecture.page.html',
  styleUrls: ['./lecture.page.scss'],
})
export class LecturePage implements OnInit {
  showAddCard: boolean = false;
  userName: string = '';
  userEmail: string = '';
  selectedFaculty: string = '';
  contact_nom: string = '';
  contact_email: string = '';
  contact_sujet: string = '';
  contact_message: string = '';

  moduleName: string = '';
  moduleCode: string = '';
  moduleLevel: string = '';
  userData: any;
  tableData: any[] = [];
  selectedModuleId: string | null = null;

  showAddStudentsModal: boolean = false;
  registeredStudents: any[] = [];
  filteredStudents: any[] = [];
  selectedModule: any;
  searchTerm: string = '';
  searchTerms = new Subject<string>();
  existingStudents: Set<string> = new Set();

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private loadingController: LoadingController,
    private auth: AngularFireAuth,
    private db: AngularFirestore,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController
  ) {
    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchStudents(term);
    });
  }

  ngOnInit() {
    this.auth.onAuthStateChanged((user) => {
      if (user && user.email) {
        this.userEmail = user.email;
        this.getUserData(user.email);
        this.getData(user.email);
      } else {
        console.log('User not logged in or email is null.');
        this.userName = 'Guest';
      }
    });
  }

  getUserData(userEmail: string) {
    this.db
      .collection('staff', (ref) => ref.where('email', '==', userEmail))
      .snapshotChanges()
      .subscribe((data) => {
        if (data.length > 0) {
          const userData = data[0].payload.doc.data() as any;
          this.userName = userData.fullName || 'Staff Member';
        } else {
          this.userName = 'Staff Member';
        }
      });
  }

  async openAnnouncementModal() {
    if (!this.selectedModuleId) {
      alert('Please select a module first.');
      return;
    }
  
    const selectedModule = this.tableData.find(module => module.id === this.selectedModuleId);
    
    if (!selectedModule) {
      alert('Module not found.');
      return;
    }
  
    const modal = await this.modalController.create({
      component: MakeAnnouncementComponent,
      componentProps: {
        moduleCode: selectedModule.moduleCode,
      }
    });
  
    await modal.present();
  }

  async openAddStudentsModal() {
    if (!this.selectedModuleId) {
      alert('Please select a module first.');
      return;
    }

    this.showAddStudentsModal = true;
    this.selectedModule = this.tableData.find(module => module.id === this.selectedModuleId);
    await this.fetchExistingStudents();
    await this.fetchRegisteredStudents();
  }

  closeAddStudentsModal() {
    this.showAddStudentsModal = false;
    this.searchTerm = '';
    this.filteredStudents = [];
    this.registeredStudents = [];
    this.existingStudents.clear();
  }

  async fetchExistingStudents() {
    try {
      const snapshot = await firebase.firestore()
        .collection('allModules')
        .doc(this.selectedModule.moduleCode)
        .collection(this.selectedModule.moduleName)
        .get();
      
      this.existingStudents = new Set(snapshot.docs.map(doc => doc.id));
    } catch (error) {
      console.error('Error fetching existing students:', error);
    }
  }

  async fetchRegisteredStudents() {
    try {
      const snapshot = await this.db.collection('registeredStudents').get().toPromise();
      if (snapshot) {
        this.registeredStudents = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...(doc.data() as { email: string; name: string; surname: string; studentNumber: string }),
            selected: false
          }))
          .filter(student => !this.existingStudents.has(student.id));
        this.filteredStudents = [...this.registeredStudents];
      } else {
        this.registeredStudents = [];
        this.filteredStudents = [];
      }
    } catch (error) {
      console.error('Error fetching registered students:', error);
      alert('An error occurred while fetching registered students.');
    }
  }

  searchStudents(term: string) {
    this.searchTerm = term;
    if (!term) {
      this.filteredStudents = [...this.registeredStudents];
    } else {
      const lowerCaseSearch = term.toLowerCase();
      this.filteredStudents = this.registeredStudents.filter(student => 
        student.studentNumber.toLowerCase().includes(lowerCaseSearch) ||
        student.name.toLowerCase().includes(lowerCaseSearch) ||
        student.surname.toLowerCase().includes(lowerCaseSearch)
      );
    }
  }

  onSearchInput(event: any) {
    this.searchTerms.next(event.target.value);
  }

  async confirmAddStudents() {
    const selectedStudents = this.filteredStudents.filter(student => student.selected);
  
    if (selectedStudents.length === 0) {
      alert('Please select at least one student.');
      return;
    }
  
    try {
      const batch = firebase.firestore().batch();
      const enrolledModulesRef = firebase.firestore().collection('enrolledModules').doc(this.selectedModule.moduleCode);
  
      for (const student of selectedStudents) {
        const studentDocRef = enrolledModulesRef.collection(this.selectedModule.moduleName).doc(student.id);
        batch.set(studentDocRef, {
          email: student.email,
          name: student.name,
          surname: student.surname,
          studentNumber: student.studentNumber,
          moduleCode: this.selectedModule.moduleCode
        });
  
        batch.set(enrolledModulesRef, {
          Enrolled: firebase.firestore.FieldValue.arrayUnion({
            status: "Enrolled",
            studentNumber: student.studentNumber
          })
        }, { merge: true });
      }
  
      await batch.commit();
      alert('Students successfully added to the module.');
      this.closeAddStudentsModal();
    } catch (error) {
      console.error('Error adding students to module:', error);
      alert('An error occurred while adding students to the module.');
    }
  }

  async presentConfirmationAlert() {
    const alert = await this.alertController.create({
      header: 'Confirmation',
      message: 'Are you sure you want to SIGN OUT?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'my-custom-alert',
          handler: () => {
            console.log('Confirmation canceled');
          },
        },
        {
          text: 'Confirm',
          handler: () => {
            this.auth
              .signOut()
              .then(() => {
                this.navCtrl.navigateForward('/login');
                this.presentToast();
              })
              .catch((error) => {
                console.error('Sign out error:', error);
              });
          },
        },
      ],
    });
    await alert.present();
  }

  async presentToast() {
    const toast = await this.toastController.create({
      message: 'SIGNED OUT!',
      duration: 1500,
      position: 'top',
    });
    await toast.present();
  }





  async addModule() {
    // Check only for the required fields: department (selectedFaculty), moduleCode, and moduleLevel
    if (!this.selectedFaculty.trim() || !this.moduleCode.trim() || !this.moduleLevel.trim()) {
        alert('Please fill in all required fields: Department, Module Code, and Module Level.');
        return;
    }

    const loader = await this.loadingController.create({
        message: 'Submitting...',
        cssClass: 'custom-loader-class',
    });
    await loader.present();

    try {
        // Assuming you're still using Firebase Auth to get the user
        const user = firebase.auth().currentUser;

        if (user && user.email) {
            // Fetch the staff document using the email
            const userEmail = user.email.toLowerCase();
            const staffQuerySnapshot = await this.db.collection('staff', ref =>
                ref.where('email', '==', userEmail)
            ).get().toPromise();

            if (!staffQuerySnapshot || staffQuerySnapshot.empty) {
                throw new Error('No staff document found for this user.');
            }

            const staffDoc = staffQuerySnapshot.docs[0];
            const staffData = staffDoc.data() as {
                staffNumber?: string;
                department?: string;
                fullName?: string;
            };

            // Ensure staffNumber is available
            const staffNumber = staffData?.staffNumber;
            if (!staffNumber) {
                throw new Error('Staff number is required to save the module.');
            }

            // Use the staffNumber as the document ID
            const moduleRef = this.db.collection('assignedLectures').doc(staffNumber);

            // Retrieve the document data if it exists
            const docSnapshot = await moduleRef.get().toPromise();

            let existingModules: any[] = []; // Ensure modules is initialized as an array
            if (docSnapshot?.exists) {
                const data = docSnapshot.data() as { modules?: any[] };
                if (data && data.modules) {
                    existingModules = data.modules; // Retrieve existing modules array if it exists
                }
            }

            // Create a new module object
            const newModule = {
                moduleCode: this.moduleCode,
                department: this.selectedFaculty,
                moduleLevel: this.moduleLevel,
                scannerOpenCount: 0,
            };

            // Add the new module to the array
            existingModules.push(newModule);

            // Update the document with the new modules array
            await moduleRef.set(
                { modules: existingModules },
                { merge: true }
            );

            // Reset form fields
            this.moduleCode = '';
            this.moduleLevel = '';
            this.selectedFaculty = '';

            loader.dismiss();
            alert('Module successfully saved');
        } else {
            loader.dismiss();
            alert('User not logged in or email is null.');
        }
    } catch (error) {
        loader.dismiss();
        if (error instanceof Error) {
            console.error('Error saving module:', error);
            alert(`An error occurred while saving the module: ${error.message}`);
        } else {
            console.error('Unexpected error:', error);
            alert('An unexpected error occurred.');
        }
    }
}









  async deleteModule() {
    if (!this.selectedModuleId) {
      alert('No module selected for deletion.');
      return;
    }
  
    const confirmAlert = await this.alertController.create({
      header: 'Confirm Deletion',
      message: 'Are you sure you want to delete this module?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Delete operation canceled');
          },
        },
        {
          text: 'Delete',
          handler: async () => {
            const loader = await this.loadingController.create({
              message: 'Deleting...',
              cssClass: 'custom-loader-class',
            });
            await loader.present();
  
            try {
              if (this.selectedModuleId) {
                await this.db.collection('modules').doc(this.selectedModuleId).delete();
                alert('Module successfully deleted');
                this.selectedModuleId = null;
  
                const user = firebase.auth().currentUser;
                if (user && user.email) {
                  this.getData(user.email);
                }
              }
              loader.dismiss();
            } catch (error) {
              loader.dismiss();
              console.error('Error deleting module:', error);
              alert('An error occurred while deleting the module.');
            }
          },
        },
      ],
    });
  
    await confirmAlert.present();
  }

  selectModule(moduleId: string) {
    this.selectedModuleId = moduleId;
    this.updateTableSelection();
  }
 
  updateTableSelection() {
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach((row) => {
      const htmlRow = row as HTMLElement;
      if (htmlRow.dataset['id'] === this.selectedModuleId) {
        htmlRow.classList.add('selected');
      } else {
        htmlRow.classList.remove('selected');
      }
    });
  }

  gottoAttendies() {
    this.router.navigate(['attendies']);
  }

  viewStudents() {
    this.router.navigate(['/view-students']);
  }

  getData(userEmail: string) {
    this.db
      .collection('assignedLectures', (ref) => ref.where('usstaffNumber', '==', userEmail))
      .snapshotChanges()
      .subscribe((data) => {
        this.userData = data.map((d) => {
          const id = d.payload.doc.id;
          const docData = d.payload.doc.data() as any;
          return { id, ...docData };
        });
        console.log(this.userData);
        this.tableData = this.userData;
        this.updateTableSelection();
      });
  }

  gotoQRscan(moduleCode: string) {
    this.router.navigate(['qr-scan'], { queryParams: { moduleCode } });
  }

  gotoProfile() {
    this.router.navigate(['profile']);
  }
}