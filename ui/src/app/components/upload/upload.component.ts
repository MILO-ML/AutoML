import { Component, ElementRef, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { parse } from 'papaparse';
import { Observable, timer } from 'rxjs';
import { switchMap, filter, finalize } from 'rxjs/operators';

import { BackendService } from '../../services/backend.service';
import { PriorJobs, PublishedModels } from '../../interfaces';

@Component({
  selector: 'app-upload',
  templateUrl: 'upload.component.html',
  styleUrls: ['upload.component.scss'],
})
export class UploadComponent implements OnInit {
  @Input() isActive: boolean;
  @Output() stepFinished = new EventEmitter();

  priorJobs$: Observable<PriorJobs[]>;
  publishedModels$: Observable<PublishedModels>;

  labels = [];
  uploadForm: FormGroup;

  constructor(
    public backend: BackendService,
    private alertController: AlertController,
    private element: ElementRef,
    private formBuilder: FormBuilder,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.uploadForm = this.formBuilder.group({
      label_column: ['', Validators.required],
      train: ['', Validators.required],
      test: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.priorJobs$ = timer(0, 5000).pipe(
      filter(() => this.isActive),
      switchMap(() => this.backend.getPriorJobs())
    );

    this.publishedModels$ = timer(0, 5000).pipe(
      filter(() => this.isActive),
      switchMap(() => this.backend.getPublishedModels())
    );
  }

  onSubmit() {
    const formData = new FormData();
    formData.append('train', this.uploadForm.get('train').value);
    formData.append('test', this.uploadForm.get('test').value);
    formData.append('label_column', this.uploadForm.get('label_column').value);

    this.backend.submitData(formData).subscribe(
      () => {
        this.stepFinished.emit({state: 'upload', data: this.labels.length});
      },
      async () => {
        const alert = await this.alertController.create({
          header: 'Unable to Upload Data',
          message: 'Please make sure the backend is reachable and try again.',
          buttons: ['Dismiss']
        });

        await alert.present();
      }
    );

    return false;
  }

  onFileSelect(event) {
    if (event.target.files.length === 1) {
      const file = event.target.files[0];

      parse(file, {
        worker: true,
        complete: async reply => {
          if (event.target.name === 'train') {
            this.labels = reply.data[0].reverse();
            this.uploadForm.get('test').reset();
          } else {
            if (this.labels.length !== reply.data[0].length) {
              const alert = await this.alertController.create({
                buttons: ['Dismiss'],
                header: 'Data Does Not Match',
                message: 'The columns from the training data does not match the number of columns in the test data.'
              });
              await alert.present();
              this.uploadForm.get(event.target.name).setErrors({
                invalidColumns: true
              });

              return;
            }
          }
        }
      });

      this.uploadForm.get(event.target.name).setValue(file);
    }
  }

  async trainPrior(job) {
    if (!job.results) {
      this.backend.currentJobId = job.id;
      this.stepFinished.emit({state: 'upload'});
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creating New Job'
    });

    await loading.present();
    await this.backend.cloneJob(job.id).toPromise();
    await loading.dismiss();
    this.stepFinished.emit({state: 'upload'});
  }

  viewPrior(id) {
    this.backend.currentJobId = id;
    this.stepFinished.emit({state: 'upload'});
    this.stepFinished.emit({state: 'train'});
  }

  launchModel(id) {
    window.open('/model/' + id, '_blank');
  }

  reset() {
    this.element.nativeElement.querySelectorAll('input[type="file"]').forEach(node => node.value = '');
    this.uploadForm.reset();
  }

  async deletePublished(id: string) {
    const alert = await this.alertController.create({
      buttons: [
        'Dismiss',
        {
          text: 'Unpublish',
          handler: (data) => {
            if (!data || data.name !== id) {
              this.showError('The entered name does not match.');
              return false;
            }

            this.unpublishModel(id);
          }
        }
      ],
      inputs: [{
        name: 'name',
        type: 'text',
        placeholder: 'Enter the model name'
      }],
      header: 'Are you sure you want to unpublish?',
      subHeader: 'This cannot be undone.',
      message: `Are you sure you want to delete the published model: '${id}'?<br><br>Type the model name below to confirm.`
    });

    await alert.present();
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({message, duration: 2000});
    toast.present();
  }

  private async unpublishModel(id: string) {
    const loading = await this.loadingController.create({message: 'Unpublishing model...'});
    await loading.present();
    this.backend.unpublishModel(id).pipe(
      finalize(() => loading.dismiss())
    ).subscribe(
      () => this.showError(`The model labeled '${id}' has been successfully unpublished.`),
      () => this.showError('An error occurred unpublishing the selected model.')
    );
  }
}
