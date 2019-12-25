import { Component, Input, OnInit } from '@angular/core';
import { AlertController, ModalController, LoadingController } from '@ionic/angular';
import { Observable, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { BackendService } from '../../services/backend.service';
import { PendingTasks } from '../../interfaces';
import { TrainComponent } from '../train/train.component';

@Component({
  selector: 'app-pending-tasks',
  templateUrl: './pending-tasks.component.html',
  styleUrls: ['./pending-tasks.component.scss'],
})
export class PendingTasksComponent implements OnInit {
  @Input() firstViewData: PendingTasks;
  pendingTasks$: Observable<PendingTasks>;

  constructor(
    private alertController: AlertController,
    private backend: BackendService,
    private loadingController: LoadingController,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.pendingTasks$ = timer(0, 5000).pipe(
      switchMap(() => this.backend.getPendingTasks())
    );
  }

  async cancelTask(id) {
    const alert = await this.alertController.create({
      buttons: [
        'Back',
        {
          text: 'Cancel Job',
          handler: async () => {
            const loader = await this.loadingController.create({message: 'Canceling Task...'});
            await loader.present();

            try {
              await this.backend.cancelTask(id).toPromise();
            } catch (error) {
              (await this.alertController.create({message: 'Unable to cancel the task', buttons: ['Dismiss']})).present();
            }
            await loader.dismiss();
          }
        }
      ],
      message: 'Are you sure that you want to cancel this job?'
    });

    await alert.present();
  }

  async showDetails(parameters) {
    const modal = await this.modalController.create({
      cssClass: 'wide-modal',
      component: TrainComponent,
      componentProps: {parameters}
    });

    await modal.present();
  }
}
