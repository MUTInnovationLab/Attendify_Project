import { Component, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { getAuth, Auth } from 'firebase/auth';

@Component({
  selector: 'app-dept-add',
  templateUrl: './dept-add.page.html',
  styleUrls: ['./dept-add.page.scss'],
})
export class DeptAddPage implements OnInit {

  staffData: any = null;
  assignedModules: any[] = [];
  attendanceData: any[] = [];
  processedData: any[] = [];
  attendanceChart: any;

  constructor(private firestore: AngularFirestore) { 
    Chart.register(...registerables); 
  }
  
  async ngOnInit() {
    await this.setStaffData();
    await this.fetchAssignedModules();
  }

  async setStaffData() {
    const auth: Auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      this.staffData = {
        staffNumber: user.uid,
        department: 'Department Not Found',
        faculty: 'Faculty Not Found',
        fullName: user.displayName || user.email,
        position: 'HOD' 
      };

      await this.fetchUserDetailsFromFirestore(user.uid);
    } else {
      console.error('No user is currently logged in');
    }
  }

  async fetchUserDetailsFromFirestore(userId: string) {
    const userDocRef = this.firestore.doc(`users/${userId}`);
    const userDocSnapshot = await userDocRef.get().toPromise();

    if (userDocSnapshot && userDocSnapshot.exists) {
      const userData = userDocSnapshot.data() as { department?: string; faculty?: string } | undefined;
      this.staffData.department = userData?.department || this.staffData.department;
      this.staffData.faculty = userData?.faculty || this.staffData.faculty;
    } else {
      console.error('User document not found in Firestore');
    }
  }

  async fetchAssignedModules() {
    if (this.staffData) {
      const facultiesCollection = this.firestore.collection('faculties', ref => 
        ref.where('name', '==', this.staffData.faculty)
      );
      const facultyDocs = await facultiesCollection.get().toPromise();

      if (!facultyDocs || facultyDocs.empty) {
        console.error('No faculty found for the user');
        return;
      }

      const facultyDoc = facultyDocs.docs[0];
      const departmentsCollection = this.firestore.collection(`${facultyDoc.ref.path}/departments`, ref =>
        ref.where('name', '==', this.staffData.department)
      );
      const departmentDocs = await departmentsCollection.get().toPromise();

      if (!departmentDocs || departmentDocs.empty) {
        console.error('No department found for the user');
        return;
      }

      const departmentDoc = departmentDocs.docs[0];
      const departmentData = departmentDoc.data() as { streams?: Record<string, any[]> } | undefined;

      if (departmentData && departmentData.streams) {
        for (const [streamName, modulesArray] of Object.entries(departmentData.streams)) {
          const streamModules = (modulesArray as any[]).flatMap((moduleData: any) => {
            return moduleData.modules.map((module: any) => ({
              code: module.moduleCode,
              level: module.moduleLevel,
              name: module.moduleName,
              stream: streamName
            }));
          });

          this.assignedModules.push(...streamModules);
        }
      }

      await this.fetchAttendanceData(this.assignedModules.map(m => m.code));
    }
  }

  async fetchAttendanceData(moduleCodes: string[]) {
    this.attendanceData = [];

    for (const moduleCode of moduleCodes) {
      const docRef = this.firestore.doc(`Attended/${moduleCode}`);
      const docSnapshot = await docRef.get().toPromise();

      if (docSnapshot && docSnapshot.exists) {
        this.attendanceData.push(docSnapshot.data());
      } else {
        console.log(`No attendance record found for module code: ${moduleCode}`);
      }
    }

    this.processAttendanceData();
    this.createAttendanceChart();
  }

  processAttendanceData() {
    if (this.attendanceData.length > 0) {
      const grouped = this.attendanceData.reduce((acc: any, curr: any) => {
        const date = new Date(curr.date).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = {};
        }
        acc[date][curr.moduleCode] = curr.attendance;
        return acc;
      }, {});

      this.processedData = Object.entries(grouped).map(([date, modules]) => ({
        date,
        modules,
      }));
    }
  }

  createAttendanceChart() {
    const canvas = document.getElementById('attendanceChart') as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');

    if (ctx) {
      const dates = [...new Set(this.attendanceData.map(data => data.date))];
      const moduleCodes = [...new Set(this.attendanceData.map(data => data.moduleCode))];

      const datasets = moduleCodes.map(moduleCode => {
        return {
          label: `Module ${moduleCode}`,
          data: dates.map(date => {
            const attendance = this.attendanceData.find(a => a.date === date && a.moduleCode === moduleCode);
            return attendance ? attendance.attendance : 0;
          }),
          backgroundColor: this.getRandomColor(),
        };
      });

      this.attendanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: dates,
          datasets: datasets,
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true },
            tooltip: { enabled: true },
          },
          scales: {
            x: { title: { display: true, text: 'Date' } },
            y: { title: { display: true, text: 'Attendance' }, beginAtZero: true },
          },
        },
      });
    } else {
      console.error('Canvas context not available.');
    }
  }

  getRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  }
}
