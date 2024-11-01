import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { AlertController } from '@ionic/angular';
import { timer } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UpdateService {
  constructor(
    private swUpdate: SwUpdate,
    private alertController: AlertController
  ) {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    timer(0, 1 * 60 * 60 * 1000).subscribe(() => {
      this.swUpdate.checkForUpdate();
    });

    this.swUpdate.available.subscribe(async () => {
      const alert = await this.alertController.create({
        header: 'Update Available',
        subHeader: 'An update is available',
        message: 'An update to the web application is now ready and can be applied by clicking the update button below.<br><br>The page will reload in it\'s current location quickly after clicking update.',
        buttons: [
          'Dismiss',
          {
            text: 'Update',
            handler: async () => {
              await this.swUpdate.activateUpdate();
              document.location.reload();
            }
          }
        ]
      });
      await alert.present();
    });
  }
}
