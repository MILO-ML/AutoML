import { Component, ElementRef, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Auth, authState } from '@angular/fire/auth';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { parse } from 'papaparse';
import { Observable, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MiloApiService } from '../../services/milo-api/milo-api.service';
import { DataSets, PublishedModels } from '../../interfaces';
import { AngularFireAnalytics } from '@angular/fire/compat/analytics';

@Component({
  selector: 'app-upload',
  templateUrl: 'upload.component.html',
  styleUrls: ['upload.component.scss'],
})
export class UploadComponent implements OnInit, OnDestroy {
  @Input() isActive: boolean;
  @Output() stepFinished = new EventEmitter();

  destroy$: ReplaySubject<boolean> = new ReplaySubject<boolean>();
  dataSets$: Observable<DataSets[]>;
  publishedModels: PublishedModels;
  alertInterfaceOptions = {
    header: 'Previous Datasets',
    subHeader: 'Select a dataset',
    translucent: true,
    cssClass: 'wide-alert'
  };

  labels = [];
  keys = Object.keys;
  uploadForm: FormGroup;

  constructor(
    public api: MiloApiService,
    private afAuth: Auth,
    private alertController: AlertController,
    private datePipe: DatePipe,
    private element: ElementRef,
    private formBuilder: FormBuilder,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private analytics: AngularFireAnalytics,


  ) {
    this.uploadForm = this.formBuilder.group({
      label_column: ['', Validators.required],
      train: ['', Validators.required],
      test: ['', Validators.required]
    });
  }

  ngOnInit() {
    authState(this.afAuth).pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        this.updateView();
      }
    });

    this.updateView();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  async onSubmit() {
    const loading = await this.loadingController.create({ message: 'Uploading dataset...' });
    await loading.present();
    const formData = new FormData();
    formData.append('train', this.uploadForm.get('train').value);
    formData.append('test', this.uploadForm.get('test').value);
    formData.append('label_column', this.uploadForm.get('label_column').value);

    this.api.submitData(formData).then(
      () => {
        this.analytics.logEvent('data_uploaded', {
          step_name: 'csv_file_uploaded',
          timestamp: Date.now(),

        })
        this.stepFinished.emit({ nextStep: 'explore' });
      },
      async error => {
        let message = 'Please make sure the backend is reachable and try again.';

        if (error.status === 406) {
          switch (error.error.reason) {
            case 'training_rows_insufficient':
              message = 'Insufficient training data. Please verify at least 50 complete rows of data are present.';
              break;
            case 'training_rows_excess':
              message = 'Excess rows in the training data. Please verify less than 10000 rows of data are present.';
              break;
            case 'training_features_excess':
              message = 'Excess features in the training data. Please verify less than 2000 features are present.';
              break;
            case 'test_rows_excess':
              message = 'Excess rows in the generalization data. Please verify less than 100000 rows of data are present.';
              break;
          }
        }
        this.analytics.logEvent('data_uploaded_error', {
          step_name: 'data_uploaded',
          status_code: error.status,
          message: message,
          timestamp: Date.now(),
        });

        const alert = await this.alertController.create({
          header: 'Unable to Upload Data',
          message,
          buttons: ['Dismiss']
        });
        console.log('FireBase Log Event Triggered');



        await alert.present();

      }
    ).finally(() => loading.dismiss());

    return false;
  }

  onFileSelect(event) {
    const errors = this.uploadForm.get(event.target.name).errors;
    if (errors) {
      delete errors.invalidColumn;
    }

    if (event.target.files.length === 1) {
      const file = event.target.files[0];

      parse(file, {
        worker: true,
        complete: function () { },
        step: async (reply, parser) => {
          parser.abort();

          if (event.target.name === 'train') {
            this.labels = (reply.data as any[]).reverse();
            this.uploadForm.get('test').reset();
            if (new Set(this.labels).size !== this.labels.length) {
              const alert = await this.alertController.create({
                buttons: ['Dismiss'],
                header: 'Duplicate Columns Detected',
                message: 'Two or more columns appear to have the same name/feature.'
              });
              await alert.present();
              this.uploadForm.get(event.target.name).setErrors({
                invalidColumns: true
              });
            }
          } else {
            if (
              this.labels.length !== (reply.data as any[]).length ||
              `${this.labels}` !== `${(reply.data as any[]).reverse()}`
            ) {
              const alert = await this.alertController.create({
                buttons: ['Dismiss'],
                header: 'Data Does Not Match',
                message: 'The columns from the training data does not match the number of columns in the test data.'
              });
              await alert.present();
              this.uploadForm.get(event.target.name).setErrors({
                invalidColumns: true
              });
            }
          }
        }
      });

      this.uploadForm.get(event.target.name).setValue(file);
    }
  }

  exploreDataSet(id) {
    this.api.currentDatasetId = id;
    this.stepFinished.emit({ nextStep: 'explore' });
  }

  async publishedOptions(model) {
    const alert = await this.alertController.create({
      header: `${model.key} Model`,
      subHeader: `This model was published on ${this.datePipe.transform(model.value.date, 'medium')}`,
      message: 'Please select one of the following options:',
      buttons: [
        { text: 'Dismiss' },
        {
          text: 'Delete',
          handler: async _ => {
            await alert.dismiss();
            this.deletePublished(model.key);
          }
        },
        {
          text: 'Rename',
          handler: async _ => {
            await alert.dismiss();
            this.renamePublished(model);
          }
        },
        { text: 'Open', handler: _ => setTimeout(() => window.open('/model/' + model.key, '_blank'), 1) }
      ]
    });

    await alert.present();
  }

  async deletePublished(name) {
    const alert = await this.alertController.create({
      buttons: [
        'Dismiss',
        {
          text: 'Delete',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Deleting published model...'
            });
            await loading.present();
            await (await this.api.deletePublishedModel(name)).toPromise();
            this.updateView();
            await loading.dismiss();
          }
        }
      ],
      header: 'Are you sure you want to delete this?',
      subHeader: 'This cannot be undone.',
      message: 'Are you sure you want to delete this published model?'
    });
    await alert.present();
  }

  async renamePublished(model) {
    const alert = await this.alertController.create({
      inputs: [{
        type: 'text',
        name: 'name',
        placeholder: 'Enter the name of your model'
      }],
      buttons: [
        'Dismiss',
        {
          text: 'Submit',
          handler: async data => {
            if (!data.name || !data.name.match(/^[!#$&-;=?-[\]_a-z~]+$/)) {
              this.showError('Invalid characters detected, please use an alphanumeric name.');
              return false;
            }

            const loading = await this.loadingController.create({
              message: 'Renaming published model...'
            });
            await loading.present();
            try {
              await (await this.api.renamePublishedModel(model.key, data.name)).toPromise();
              this.updateView();
            } catch (err) {
              this.showError(`Unable to rename the model ${model.key}.`)
            }
            await loading.dismiss();
          }
        }
      ],
      header: `Rename ${model.key}`,
      message: 'Enter a new name below to rename the model'
    });
    await alert.present();
  }

  reset() {
    this.element.nativeElement.querySelectorAll('input[type="file"]').forEach(node => node.value = '');
    this.uploadForm.reset();
  }

  private async updateView() {
    this.dataSets$ = (await this.api.getDataSets()).pipe(
      takeUntil(this.destroy$)
    );

    (await this.api.getPublishedModels()).subscribe(data => this.publishedModels = data);
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({ message, duration: 2000 });
    return toast.present();
  }
}
