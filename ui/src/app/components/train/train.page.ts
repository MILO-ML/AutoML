import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

import * as pipelineOptions from './pipeline.processors.json';
import { BackendService } from '../../services/backend.service';
import { requireAtLeastOneCheckedValidator } from '../../validators/at-least-one-checked.validator';

@Component({
  selector: 'app-train',
  templateUrl: 'train.page.html',
  styleUrls: ['train.page.scss']
})
export class TrainPage implements OnInit {
  allPipelines;
  training = false;
  trainForm: FormGroup;
  pipelineProcessors = (pipelineOptions as any).default;

  constructor(
    private alertController: AlertController,
    private backend: BackendService,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.trainForm = this.formBuilder.group({
      estimators: this.formBuilder.array(this.pipelineProcessors.estimators, requireAtLeastOneCheckedValidator()),
      scalers: this.formBuilder.array(this.pipelineProcessors.scalers, requireAtLeastOneCheckedValidator()),
      featureSelectors: this.formBuilder.array(this.pipelineProcessors.featureSelectors, requireAtLeastOneCheckedValidator()),
      searchers: this.formBuilder.array(this.pipelineProcessors.searchers, requireAtLeastOneCheckedValidator()),
      scorers: this.formBuilder.array(this.pipelineProcessors.scorers, requireAtLeastOneCheckedValidator()),
      shuffle: [true]
    });

    this.trainForm.get('estimators').valueChanges.subscribe(this.generatePipelines.bind(this));
    this.trainForm.get('scalers').valueChanges.subscribe(this.generatePipelines.bind(this));
    this.trainForm.get('featureSelectors').valueChanges.subscribe(this.generatePipelines.bind(this));
    this.trainForm.get('searchers').valueChanges.subscribe(this.generatePipelines.bind(this));
    this.trainForm.get('scorers').valueChanges.subscribe(this.generatePipelines.bind(this));

    try {
      const options = JSON.parse(localStorage.getItem('training-options'));
      this.trainForm.setValue(options);
    } catch (err) {}
  }

  ngOnInit() {
    if (this.route.snapshot.params.labels && this.route.snapshot.params.labels < 3) {
      this.trainForm.get('featureSelectors').disable();
    }

    this.generatePipelines();
  }

  startTraining() {
    this.training = true;

    const formData = new FormData();
    formData.append('ignore_estimator', this.getValues('estimators').join(','));
    formData.append('ignore_scaler', this.getValues('scalers').join(','));
    formData.append('ignore_feature_selector', this.getValues('featureSelectors').join(','));
    formData.append('ignore_searcher', this.getValues('searchers').join(','));
    formData.append('ignore_scorer', this.getValues('scorers').join(','));

    if (!this.trainForm.get('shuffle').value) {
      formData.append('ignore_shuffle', 'true');
    }

    this.backend.startTraining(formData).subscribe(
      () => {
        this.training = false;
        this.router.navigate(['/results']);
      },
      async () => {
        const alert = await this.alertController.create({
          header: 'Unable to Start Training',
          message: 'Please make sure the backend is reachable and try again.',
          buttons: ['Dismiss']
        });

        await alert.present();
      }
    );

    localStorage.setItem('training-options', JSON.stringify(this.trainForm.value));
  }

  private getValues(key) {
    return this.trainForm.get(key).value.flatMap((value, index) => {
      return value ? [] : this.pipelineProcessors[key][index].value;
    });
  }

  private getChecked(key) {
    return this.trainForm.get(key).value.flatMap((value, index) => {
      return !value ? [] : this.pipelineProcessors[key][index].label;
    });
  }

  private product(..._) {
    const args = Array.prototype.slice.call(arguments);
    return args.reduce((accumulator, value) => {
      const tmp = [];
      accumulator.forEach((a0) => {
        value.forEach((a1) => {
          tmp.push(a0.concat(a1));
        });
      });
      return tmp;
    }, [[]]);
  }

  private generatePipelines() {
    this.allPipelines = this.product(
      this.getChecked('estimators'),
      this.getChecked('scalers'),
      this.getChecked('featureSelectors'),
      this.getChecked('searchers'),
      this.getChecked('scorers'),
    );
  }
}