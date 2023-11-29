import { Component, EventEmitter, HostBinding, OnInit, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { LoadingController, AlertController } from '@ionic/angular';

import { MiloApiService } from '../../services/milo-api/milo-api.service';
import { DataAnalysisReply, Jobs } from '../../interfaces';
import { AngularFireAnalytics } from '@angular/fire/compat/analytics';


@Component({
  selector: 'app-explore',
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss'],
})
export class ExploreComponent implements OnInit {
  @Output() stepFinished = new EventEmitter();
  @Output() resetState = new EventEmitter();

  analysis: DataAnalysisReply;
  jobs: MatTableDataSource<Jobs>;
  columns = ['Date', 'Status', 'Actions'];
  singleColumn = window.innerWidth < 991;
  currentTab = 'previous';

  constructor(
    public api: MiloApiService,
    private alertController: AlertController,
    private datePipe: DatePipe,
    private loadingController: LoadingController,
    private analytics: AngularFireAnalytics,

  ) { }

  @HostBinding('class.hasJobs')
  get hasJobs() {
    return this.jobs?.data.length > 0;
  }

  async ngOnInit() {
    if (!this.api.currentDatasetId) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Generating feature analysis...'
    });
    await loading.present();

    window.matchMedia('(max-width: 991px)').addEventListener('change', event => {
      this.singleColumn = event.matches;
    });

    this.analysis = await (await this.api.getDataAnalysis()).toPromise();
    this.updateJobs();
    await loading.dismiss();
  }

  getValue(job, column) {
    switch (column) {
      case 'Date':
        return this.datePipe.transform(job.date, 'shortDate');
      case 'Status':
        return job.metadata.date ? 'Completed' : 'Pending';
    }
  }

  useJob(id, step) {
    this.api.currentJobId = id;
    this.stepFinished.emit({ nextStep: step, data: Object.keys(this.analysis.analysis.train.summary).length });
  }

  async deleteJob(id) {
    const alert = await this.alertController.create({
      buttons: [
        'Dismiss',
        {
          text: 'Delete',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Deleting job...'
            });
            await loading.present();
            await (await this.api.deleteJob(id)).toPromise();
            this.updateJobs();
            await loading.dismiss();
          }
        }
      ],
      header: 'Are you sure you want to delete this?',
      subHeader: 'This cannot be undone.',
      message: 'Are you sure you want to delete the selected run?'
    });
    await alert.present();
  }

  async deleteDataset() {
    const alert = await this.alertController.create({
      buttons: [
        'Dismiss',
        {
          text: 'Delete',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Deleting dataset...'
            });
            await loading.present();
            await (await this.api.deleteDataset(this.api.currentDatasetId)).toPromise();
            this.resetState.emit();
            await loading.dismiss();
          }
        }
      ],
      header: 'Are you sure you want to delete this?',
      subHeader: 'This cannot be undone.',
      message: 'Are you sure you want to delete this dataset?'
    });
    await alert.present();
  }

  async newJob() {
    try {
      const loading = await this.loadingController.create({ message: 'Creating new job...' });
      await loading.present();
      await this.api.createJob();
      this.analytics.logEvent('data_reviewed', {
        step_name: 'graphically_data_reviewed ',
        timestamp: Date.now(),

      })
      this.stepFinished.emit({ nextStep: 'train', data: Object.keys(this.analysis.analysis.train.summary).length });
      await loading.dismiss();
    }
    catch (err) {
      this.analytics.logEvent('data_reviewed_error', {
        step_name: 'data_reviewed',
        status_code: 400,
        message: err.message,
        timestamp: Date.now(),
      });
    }

  }

  private async updateJobs() {
    this.jobs = new MatTableDataSource(
      (await (await this.api.getJobs()).toPromise()).filter(job => job.metadata.datasetid === this.api.currentDatasetId)
    );
    this.currentTab = this.jobs.data.length ? 'previous' : 'analysis';
  }
}
