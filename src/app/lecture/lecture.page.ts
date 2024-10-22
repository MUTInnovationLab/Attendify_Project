import { Component, OnInit } from '@angular/core';
import { NavController, LoadingController, AlertController, ToastController, ModalController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app'; // Import firebase app
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { firstValueFrom, Subject } from 'rxjs';
import { MakeAnnouncementComponent } from '../make-announcement/make-announcement.component'; // Import the component


interface StaffMember {
  email: string;
  fullName: string;
}

interface ModuleData {
  moduleCode: string;
  moduleLevel: string;
  department: string;
  scannerOpenCount: number;
}

interface AssignedLectures {
  [key: string]: ModuleData;
}

@Component({
  selector: 'app-lecture',
  templateUrl: './lecture.page.html',
  styleUrls: ['./lecture.page.scss'],
})
export class LecturePage implements OnInit {

  showAddCard: boolean = false;
  userName: string = ''; // Store the user's name
  userEmail: string = ''; // Store the user's email
  contact_nom: string = '';
  contact_email: string = '';
  contact_sujet: string = '';
  contact_message: string = '';
  selectedFaculty: string = '';
  moduleName: any;
  moduleCode: any;
  moduleLevel: any;
  userData: any;
  tableData: any[] = [];
  selectedModuleId: string | null = null; // Store selected module ID
  navController: NavController;

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
    this.navController = navCtrl;
    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchStudents(term);
    });
  }


  ngOnInit() {
    console.log('ngOnInit called');
    
    this.auth.onAuthStateChanged((user) => {
      console.log('Auth state changed:', user);
      
      if (user && user.email) {
        console.log('User is logged in with email:', user.email);
        this.userEmail = user.email;
        this.getUserData(user.email);
        this.getData(user.email);
      } else {
        console.log('No user logged in');
        this.userName = 'Guest';
        this.tableData = [];
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
          this.userName = userData.fullName || 'Staff Member'; // Use fullName if available, otherwise use 'Staff Member'
        } else {
          this.userName = 'Staff Member'; // Set to 'Staff Member' if no data found
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
        moduleCode: selectedModule.moduleCode, // Use the actual module code like "CIV100"
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
    const selectedStudents = this.filteredStudents.filter(student => student.selected);
    
    if (selectedStudents.length === 0) {
      alert('Please select at least one student.');
      return;
    }
  
    try {
      const batch = firebase.firestore().batch();
      const moduleRef = firebase.firestore().collection('allModules').doc(this.selectedModule.moduleCode);
      const studentsRef = moduleRef.collection(this.selectedModule.moduleName);
  
      const enrolledmodulesRef = firebase.firestore().collection('enrolledModules');
  
      for (const student of selectedStudents) {
        const studentDocRef = studentsRef.doc(student.id);
        batch.set(studentDocRef, {
          email: student.email,
          name: student.name,
          surname: student.surname,
          studentNumber: student.studentNumber,
          moduleCode: this.selectedModule.moduleCode
        });
  
        // Use studentNumber as document ID in 'enrolledmodules'
        const enrolledStudentDocRef = enrolledmodulesRef.doc(student.studentNumber.toString());
        const enrolledStudentDoc = await enrolledStudentDocRef.get();
        
        if (enrolledStudentDoc.exists) {
          // Student exists, update the moduleCode array
          const enrolledStudentData = enrolledStudentDoc.data();
          if (enrolledStudentData) {
            const existingModuleCodes = enrolledStudentData['moduleCode'] || [];
            if (!existingModuleCodes.includes(this.selectedModule.moduleCode)) {
              existingModuleCodes.push(this.selectedModule.moduleCode);
              batch.update(enrolledStudentDocRef, { moduleCode: existingModuleCodes });
            }
          }
        } else {
          // Student does not exist, create a new document
          batch.set(enrolledStudentDocRef, {
            email: student.email,
            name: student.name,
            surname: student.surname,
            studentNumber: student.studentNumber,
            moduleCode: [this.selectedModule.moduleCode]
          });
        }
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
                this.navController.navigateForward('/login');
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
  // Validate fields
  if (!this.moduleName || !this.moduleCode || !this.moduleLevel) {
    alert('Please fill in all fields before submitting.');
    return; // Exit the function if any field is empty
  }

  const loader = await this.loadingController.create({
    message: 'Submitting...',
    cssClass: 'custom-loader-class',
  });
  await loader.present();

  try {
    const user = firebase.auth().currentUser;

    // Assume you fetch or store the staff number somewhere in your app (user.staffNumber).
    const staffNumber = ' '; // Replace with actual logic to get staff number

    if (user && user.email && staffNumber) {
      const staffDocRef = this.db.collection('assignedLecturers').doc(staffNumber);

      // Fetch the staff document snapshot using firstValueFrom to handle the observable
      const staffDoc = await firstValueFrom(staffDocRef.get());

      // Prepare the module data to add
      const moduleData = {
        moduleName: this.moduleName,
        moduleCode: this.moduleCode,
        moduleLevel: this.moduleLevel,
        userEmail: user.email,
      };

      if (staffDoc.exists) {
        // Update the existing document by adding the module to the 'modules' array
        await staffDocRef.update({
          modules: firebase.firestore.FieldValue.arrayUnion(moduleData),
        });
      } else {
        // Create the document with the first module entry
        await staffDocRef.set({
          modules: [moduleData],
        });
      }

      // Clear the form fields after successful submission
      this.moduleName = '';
      this.moduleCode = '';
      this.moduleLevel = '';

      loader.dismiss();
      alert('Module successfully saved');
      this.getData(user.email); // Refresh the module list
    } else {
      loader.dismiss();
      alert('User not logged in or staff number is missing.');
    }
  } catch (error) {
    loader.dismiss();
    console.error('Error saving module:', error);
    alert('An error occurred while saving the module.');
  }
}

  

  async deleteModule() {
    if (!this.selectedModuleId) {
      alert('No module selected for deletion.');
      return;
    }
  
    // Creating the confirm alert
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
              // Ensure selectedModuleId is a string and not null
              if (this.selectedModuleId) {
                await this.db.collection('modules').doc(this.selectedModuleId).delete();
                alert('Module successfully deleted');
                this.selectedModuleId = null; // Clear the selected module
  
                const user = firebase.auth().currentUser;
                if (user && user.email) {
                  this.getData(user.email); // Refresh the module list
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
  
    // Present the confirmation alert
    await confirmAlert.present();
  }
  

  selectModule(moduleId: string) {
    this.selectedModuleId = moduleId;
    // Update the table selection
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


  
  async getData(userEmail: string) {
    console.log('getData called with email:', userEmail);
  
    if (!userEmail) {
      console.error('No email provided to getData');
      return;
    }
  
    try {
      const currentUser = await this.auth.currentUser;
      if (!currentUser) {
        console.error('No authenticated user found');
        return;
      }
  
      console.log('Querying staff collection for email:', userEmail);
      
      const staffQuery = await this.db.collection<StaffMember>('staff').get().toPromise();
      
      if (!staffQuery || staffQuery.empty) {
        console.error('No staff found with email:', userEmail);
        this.tableData = [];
        return;
      }
  
      const staffDoc = staffQuery.docs.find(doc => {
        const data = doc.data();
        return data.email === userEmail;
      });
  
      if (!staffDoc) {
        console.error('Staff document not found for email:', userEmail);
        return;
      }
  
      const staffNumber = staffDoc.id;
      console.log('Found staff number:', staffNumber);
  
      const assignedLecturesRef = this.db
        .collection<AssignedLectures>('assignedLectures')
        .doc(staffNumber);
  
      const docSnapshot = await assignedLecturesRef.get().toPromise();
      
      if (!docSnapshot?.exists) {
        console.log('No assignedLectures document exists for staff number:', staffNumber);
        await assignedLecturesRef.set({});
      }
  
      assignedLecturesRef.snapshotChanges().subscribe(
        (docSnapshot) => {
          if (docSnapshot.payload.exists) {
            const lectureData = docSnapshot.payload.data() as AssignedLectures;
            console.log('Raw lecture data:', lectureData);
  
            // Check if 'modules' exists and is an array
            if (Array.isArray(lectureData['modules'])) {
              // Extract moduleCode from each module in the array
              this.tableData = lectureData['modules'].map((module: any) => ({
                moduleCode: module.moduleCode
              }));
            } else {
              console.error('modules is not an array or does not exist');
              this.tableData = [];
            }
  
            console.log('Processed moduleCodes:', this.tableData);
            this.updateTableSelection();
          } else {
            console.log('Document exists but is empty for staff number:', staffNumber);
            this.tableData = [];
          }
        },
        error => {
          console.error('Error in assignedLectures subscription:', error);
          this.tableData = [];
        }
      );
  
    } catch (error) {
      console.error('Error in getData:', error);
      this.tableData = [];
    }
  }
  
  
  
  gotoQRscan(moduleCode: string) {
    this.router.navigate(['qr-scan'], { queryParams: { moduleCode } });
  }

  gotoProfile() {
    this.router.navigate(['profile']);
  }

}