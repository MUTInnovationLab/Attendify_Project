import { Component, OnInit } from '@angular/core';
import { NavController, LoadingController, AlertController, ToastController, ModalController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { firstValueFrom, Subject } from 'rxjs';
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
  department: any;

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

  async ngOnInit() {
    this.auth.onAuthStateChanged((user) => {
      if (user && user.email) {
        this.userEmail = user.email;
        this.getUserData(user.email);
        // Get staff number first, then get modules
        this.getStaffNumberAndModules(user.email);
      } else {
        console.log('User not logged in or email is null.');
        this.userName = 'Guest';
      }
    });
  }

  async getStaffNumberAndModules(userEmail: string) {
    try {
      // First get the staff document to get the staff number
      const staffSnapshot = await this.db.collection('staff')
        .ref.where('email', '==', userEmail)
        .get();

      if (!staffSnapshot.empty) {
        const staffDoc = staffSnapshot.docs[0];
        const staffData = staffDoc.data() as { staffNumber: string };
        const staffNumber = staffData.staffNumber;

        // Now get the modules using the staff number
        this.getData(staffNumber);
      } else {
        console.error('Staff document not found for email:', userEmail);
      }
    } catch (error) {
      console.error('Error getting staff number:', error);
    }
  }


    async getData(staffNumber: string) {
    // Get the specific document using staffNumber
    this.db.collection('assignedLectures').doc(staffNumber)
      .snapshotChanges()
      .subscribe((docSnapshot) => {
        if (docSnapshot.payload.exists) {
          const data = docSnapshot.payload.data() as { modules: any[] };
          if (data && data.modules) {
            // Transform the modules array into the format expected by the template
            this.tableData = data.modules.map((module, index) => ({
              id: `${index}`, // Generate an ID for selection purposes
              moduleCode: module.moduleCode,
              department: module.department,
              moduleLevel: module.moduleLevel,
              scannerOpenCount: module.scannerOpenCount
            }));
          } else {
            this.tableData = [];
          }
        } else {
          console.log('No modules found for staff number:', staffNumber);
          this.tableData = [];
        }
        this.updateTableSelection();
      }, error => {
        console.error('Error fetching modules:', error);
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
          this.department = userData.department || 'Unknown';  // Fetch department from user data
          this.selectedFaculty = userData.faculty || 'Unknown'; // Fetch faculty from user data
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
        .collection('enrolledModules')
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
      const snapshot = await this.db.collection('students').get().toPromise();
      if (snapshot) {
        this.registeredStudents = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...(doc.data() as { email: string; name: string; surname: string; studentNumber: string }),
            selected: false
          }))
          .filter(student => !this.existingStudents.has(student.id)); // Filter out existing students
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
    // Validate inputs
    if (!this.selectedModule?.moduleCode) {
      alert('Invalid module selection. Please select a valid module.');
      return;
    }
  
    const selectedStudents = this.filteredStudents.filter(student => student.selected);
    if (selectedStudents.length === 0) {
      alert('Please select at least one student.');
      return;
    }
  
    try {
      const batch = firebase.firestore().batch();
      const enrolledModulesRef = firebase.firestore().collection('enrolledModules').doc(this.selectedModule.moduleCode);
  
      // Get current enrolled students to avoid duplicates
      const enrolledDoc = await enrolledModulesRef.get();
      const currentEnrolled = enrolledDoc.exists ? 
        (enrolledDoc.data()?.['Enrolled'] || []) : [];
  
      // Filter out already enrolled students
      const newStudents = selectedStudents.filter(student =>
        !currentEnrolled.some((enrolled: any) =>
          enrolled.stud === student.studentNumber
        )
      );
  
      if (newStudents.length === 0) {
        alert('All selected students are already enrolled in this module.');
        return;
      }
  
      // Create the module document if it doesn't exist
      if (!enrolledDoc.exists) {
        batch.set(enrolledModulesRef, {
          moduleCode: this.selectedModule.moduleCode,
          Enrolled: []
        });
      }
  
      // Add all new students to the Enrolled array in a single batch update
      const newEnrollments = newStudents.map(student => ({
        status: "Enrolled",
        studentNumber: student.studentNumber,
       // email: student.email,
       // name: student.name,
        //surname: student.surname
      }));
  
      batch.update(enrolledModulesRef, {
        Enrolled: firebase.firestore.FieldValue.arrayUnion(...newEnrollments)
      });
  
      await batch.commit();
  
      const toast = await this.toastController.create({
        message: `Successfully enrolled ${newStudents.length} student(s)`,
        duration: 2000,
        position: 'top'
      });
      toast.present();
  
      this.closeAddStudentsModal();
  
    } catch (error) {
      console.error('Error adding students to module:', error);
      alert('An error occurred while adding students to the module: ' + 
            (error instanceof Error ? error.message : 'Unknown error'));
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
    if (!this.moduleName || !this.moduleCode || !this.moduleLevel || !this.department) {
      alert('Please fill in all fields before submitting.');
      return;
    }
  
    const loader = await this.loadingController.create({
      message: 'Submitting...',
      cssClass: 'custom-loader-class',
    });
    await loader.present();
  
    try {
      const user = firebase.auth().currentUser;
  
      if (user && user.email) {
        // First get the staff number from the staff collection
        const staffSnapshot = await this.db.collection('staff')
          .ref.where('email', '==', user.email)
          .get();
  
        if (staffSnapshot.empty) {
          throw new Error('Staff document not found');
        }
  
        const staffDoc = staffSnapshot.docs[0];
        const staffData = staffDoc.data() as { staffNumber: string };
        const staffNumber = staffData.staffNumber;
  
        if (!staffNumber) {
          throw new Error('Staff number not found');
        }
  
        // Reference to the assignedLectures document
        const staffDocRef = this.db.collection('assignedLectures').doc(staffNumber);
        const staffAssignedDoc = await firstValueFrom(staffDocRef.get());
  
        const moduleData = {
          moduleName: this.moduleName,
          moduleCode: this.moduleCode,
          moduleLevel: this.moduleLevel,
          userEmail: user.email,
          department: this.department,
          faculty: this.selectedFaculty,
          scannerOpenCount: 0 // Initialize scanner count
        };
  
        if (staffAssignedDoc.exists) {
          // If document exists, add to existing modules array
          await staffDocRef.update({
            modules: firebase.firestore.FieldValue.arrayUnion(moduleData),
          });
        } else {
          // If document doesn't exist, create new one with modules array
          await staffDocRef.set({
            modules: [moduleData],
          });
        }
  
        // Clear form fields
        this.moduleName = '';
        this.moduleCode = '';
        this.moduleLevel = '';
        
        loader.dismiss();
        alert('Module successfully saved');
        
        // Refresh the modules data using the staff number
        this.getData(staffNumber);
      } else {
        loader.dismiss();
        alert('User not logged in.');
      }
    } catch (error) {
      loader.dismiss();
      console.error('Error saving module:', error);
      alert('An error occurred while saving the module: ' + 
            (error instanceof Error ? error.message : 'Unknown error'));
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
            // Get current user
            const user = firebase.auth().currentUser;
            if (!user || !user.email) {
              throw new Error('No user logged in');
            }

            // Specify the structure of the documents we're working with
            interface StaffDoc {
              staffNumber: string;
            }

            // Get staff number from staff collection
            const staffQuerySnapshot = await this.db
              .collection('staff')
              .ref.where('email', '==', user.email)
              .get() as firebase.firestore.QuerySnapshot<StaffDoc>;  // Fixing the unknown type

            if (staffQuerySnapshot.empty) {
              throw new Error('Staff document not found');
            }

            const staffNumber = staffQuerySnapshot.docs[0].data().staffNumber;

            // Get the document reference
            const docRef = this.db.collection('assignedLectures').doc(staffNumber);

            // Get current document data
            const doc = await docRef.get().toPromise();

            if (doc && doc.exists) {
              const data = doc.data() as { modules: any[] };
              if (!data || !data.modules) {
                throw new Error('No modules found in document');
              }

              // Find the module to delete based on selectedModuleId (which is the index)
              const moduleIndex = parseInt(this.selectedModuleId as string);  // Ensure selectedModuleId is string
              const modules = [...data.modules];

              // Remove the module at the specified index
              modules.splice(moduleIndex, 1);

              // Update the document with the new modules array
              await docRef.update({ modules: modules });

              this.selectedModuleId = null;
              alert('Module successfully deleted');
            } else {
              throw new Error('Document not found');
            }

          } catch (error) {
            console.error('Error deleting module:', error);
            alert('An error occurred while deleting the module: ' + 
                  (error instanceof Error ? error.message : 'Unknown error'));
          } finally {
            loader.dismiss();
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

  gotoQRscan(moduleCode: string) {
    this.router.navigate(['qr-scan'], { queryParams: { moduleCode } });
  }

  gotoProfile() {
    this.router.navigate(['profile']);
  }
}     