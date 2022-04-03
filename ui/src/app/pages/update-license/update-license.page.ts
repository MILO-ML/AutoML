import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

import { environment } from '../../../environments/environment';
import packageJson from '../../../../../package.json';
import { MiloApiService } from '../../services';

@Component({
  selector: 'app-update-license',
  templateUrl: './update-license.page.html',
  styleUrls: ['./update-license.page.scss'],
})
export class UpdateLicensePageComponent {
  version = packageJson.version;
  license = new FormControl('', [Validators.required]);

  constructor(
    public api: MiloApiService,
    private router: Router,
    private alertController: AlertController
  ) {}

  get isDocker() {
    return environment.name === 'docker';
  }

  async activate() {
    try {
      await this.api.activateLicense(this.license.value.trim());
      this.router.navigate(['/']);
    } catch(err) {
      (await this.alertController.create({
        buttons: ['Dismiss'],
        message: 'Invalid license code. Please try again.'
      })).present();
    }
  }
}
