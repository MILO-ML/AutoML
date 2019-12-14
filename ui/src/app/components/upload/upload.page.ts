import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController } from '@ionic/angular';
import { parse } from 'papaparse';
import { Observable, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { BackendService } from '../../services/backend.service';
import { PriorJobs } from '../../interfaces';

@Component({
  selector: 'app-upload',
  templateUrl: 'upload.html',
  styleUrls: ['upload.scss'],
})
export class UploadPage implements OnInit {
  @Input() stepFinished;

  priorJobs$: Observable<PriorJobs[]>;
  labels = [];
  uploadForm: FormGroup;

  constructor(
    public backend: BackendService,
    private alertController: AlertController,
    private formBuilder: FormBuilder,
    private loadingController: LoadingController
  ) {
    this.uploadForm = this.formBuilder.group({
      label_column: ['', Validators.required],
      train: ['', Validators.required],
      test: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.priorJobs$ = timer(0, 10000).pipe(
      switchMap(() => this.backend.getPriorJobs())
    );
  }

  onSubmit() {
    const formData = new FormData();
    formData.append('train', this.uploadForm.get('train').value);
    formData.append('test', this.uploadForm.get('test').value);
    formData.append('label_column', this.uploadForm.get('label_column').value);

    this.backend.submitData(formData).subscribe(
      () => {
        this.stepFinished('upload', this.labels.length);
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
      this.stepFinished('upload');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creating New Job'
    });

    await loading.present();
    await this.backend.cloneJob(job.id).toPromise();
    await loading.dismiss();
    this.stepFinished('upload');
  }

  viewPrior(id) {
    this.backend.currentJobId = id;
    this.stepFinished('upload');
    this.stepFinished('train');
  }

  reset() {
    this.uploadForm.reset();
  }
}
