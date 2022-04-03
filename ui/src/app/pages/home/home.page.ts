import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

import { environment } from '../../../environments/environment';
import packageJson from '../../../../../package.json';
import { MiloApiService } from '../../services';
import { takeUntil } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePageComponent implements OnInit, OnDestroy {
  version = packageJson.version;
  license = new FormControl('', [Validators.required]);
  destroy$ = new ReplaySubject<boolean>();

  constructor(
    public api: MiloApiService,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.api.events.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event === 'license_error') {
        this.router.navigate(['update-license']);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
  }

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
