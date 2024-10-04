import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  constructor(private router: Router, private loadingController: LoadingController) {}

  async ngOnInit() {
    setTimeout(() => {
      this.router.navigate(['/login']); // Navigate to the login page after a delay
    }, 3000);
  }

}