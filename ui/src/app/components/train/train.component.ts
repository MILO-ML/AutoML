import { Component, Input, EventEmitter, Output, OnChanges, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { timer, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { TaskAdded } from '../../interfaces';
import * as pipelineOptions from '../../interfaces/pipeline.processors.json';
import { TextareaModalComponent } from '../../components/textarea-modal/textarea-modal.component';
import { BackendService } from '../../services/backend.service';
import { requireAtLeastOneCheckedValidator } from '../../validators/at-least-one-checked.validator';

@Component({
  selector: 'app-train',
  templateUrl: 'train.component.html',
  styleUrls: ['train.component.scss']
})
export class TrainComponent implements OnChanges, OnInit {
  @Input() featureCount;
  @Input() parameters;
  @Output() reset = new EventEmitter();
  @Output() stepFinished = new EventEmitter();

  statusPoller$: Subscription;
  allPipelines;
  showAdvanced = !environment.production;
  defaultHyperParameters = {grid: {}, random: {}};
  training = false;
  trainForm: FormGroup;
  pipelineProcessors = (pipelineOptions as any).default;

  constructor(
    private alertController: AlertController,
    private backend: BackendService,
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController
  ) {
    this.trainForm = this.formBuilder.group({
      estimators: this.formBuilder.array(this.pipelineProcessors.estimators, requireAtLeastOneCheckedValidator()),
      scalers: this.formBuilder.array(this.pipelineProcessors.scalers, requireAtLeastOneCheckedValidator()),
      featureSelectors: this.formBuilder.array(this.pipelineProcessors.featureSelectors, requireAtLeastOneCheckedValidator()),
      searchers: this.formBuilder.array(this.pipelineProcessors.searchers, requireAtLeastOneCheckedValidator()),
      scorers: this.formBuilder.array(this.pipelineProcessors.scorers),
      shuffle: [true],
      hyperParameters: {...this.defaultHyperParameters}
    });
  }

  ngOnInit() {
    if (this.parameters) {
      this.setValues('estimators', this.parameters.ignore_estimator.split(','));
      this.setValues('scalers', this.parameters.ignore_scaler.split(','));
      this.setValues('featureSelectors', this.parameters.ignore_feature_selector.split(','));
      this.setValues('searchers', this.parameters.ignore_searcher.split(','));
      this.setValues('scorers', this.parameters.ignore_scorer.split(','));
      this.trainForm.get('shuffle').setValue(!this.parameters.ignore_shuffle);

      try {
        this.trainForm.get('hyperParameters').setValue(
          JSON.parse(this.parameters.hyper_parameters) || {...this.defaultHyperParameters}
        );
      } catch (err) {}

      this.trainForm.disable();
    } else {
      try {
        const options = JSON.parse(localStorage.getItem('training-options'));
        this.trainForm.setValue(options);
      } catch (err) {}
    }
  }

  ngOnChanges() {
    if (this.featureCount && this.featureCount < 3) {
      const features = this.trainForm.get('featureSelectors');
      const disabledValues = new Array(features.value.length).fill(0);

      /** Enable the `None` feature selector */
      disabledValues[0] = 1;
      features.setValue(disabledValues);
      features.disable();
    }
  }

  startTraining() {
    this.training = true;

    const formData = new FormData();
    formData.append('ignore_estimator', this.getValues('estimators').join(','));
    formData.append('ignore_scaler', this.getValues('scalers').join(','));
    formData.append('ignore_feature_selector', this.getValues('featureSelectors').join(','));
    formData.append('ignore_searcher', this.getValues('searchers').join(','));
    formData.append('ignore_scorer', this.getValues('scorers').join(','));

    if (this.showAdvanced) {
      formData.append('hyper_parameters', JSON.stringify(this.trainForm.get('hyperParameters').value));
    }

    if (!this.trainForm.get('shuffle').value) {
      formData.append('ignore_shuffle', 'true');
    }

    this.backend.startTraining(formData).subscribe(
      (task: TaskAdded) => {
        this.checkStatus(task);
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

    this.generatePipelines();
  }

  async adjustEstimator(event, estimator) {
    event.preventDefault();

    const modal = await this.modalController.create({
      component: TextareaModalComponent,
      componentProps: {
        buttons: [
          {name: 'Dismiss'},
          (!this.parameters ? {
            name: 'Submit',
            handler: (data) => {
              const hyperParameters = this.trainForm.get('hyperParameters');
              const current = hyperParameters.value;

              try {
                current.grid[estimator.value] = data.grid && data.grid !== '{}' ? JSON.parse(data.grid) : undefined;
              } catch (err) {
                this.showError('Unable to parse the grid parameters');
                return false;
              }

              try {
                current.random[estimator.value] = data.random && data.random !== '{}' ? JSON.parse(data.random) : undefined;
              } catch (err) {
                this.showError('Unable to parse the random parameters');
                return false;
              }

              hyperParameters.setValue(current);
            }
          } : {})
        ],
        header: 'Adjust Hyperparameter Range',
        message: `Please enter the hyperparameter range for '${estimator.label}' in JSON format:`,
        inputs: [
          {
            name: 'grid',
            disabled: !!this.parameters,
            placeholder: 'Enter the hyperparameter range for grid search...',
            value: JSON.stringify(this.trainForm.get('hyperParameters').value.grid[estimator.value], undefined, 2)
          },
          {
            name: 'random',
            disabled: !!this.parameters,
            placeholder: 'Enter the hyperparameter range for random search...',
            value: JSON.stringify(this.trainForm.get('hyperParameters').value.random[estimator.value], undefined, 2)
          }
        ]
      }
    });

    await modal.present();
  }

  areHyperParametersSet(estimator) {
    const current = this.trainForm.get('hyperParameters').value;
    return Object.keys(current.grid[estimator] || {}).length || Object.keys(current.random[estimator] || {}).length;
  }

  resetPoller() {
    if (this.statusPoller$) {
      this.statusPoller$.unsubscribe();
    }
  }

  private getValues(key) {
    return this.trainForm.get(key).value.flatMap((value, index) => {
      return value ? [] : this.pipelineProcessors[key][index].value;
    });
  }

  private setValues(key, array) {
    this.trainForm.get(key).setValue(
      this.pipelineProcessors[key].map(i => !array.includes(i.value))
    );
  }

  private getChecked(key): any[] {
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

      /** Manually add this since it's required for the UI */
      this.getChecked('scorers').concat('ROC_AUC'),
    );
  }

  private checkStatus(task) {
    this.statusPoller$ = timer(1000, 5000).pipe(
      switchMap(() => this.backend.getTaskStatus(task.id))
    ).subscribe(
      async (status) => {
        if (status.state === 'SUCCESS') {
          this.resetPoller();
          this.training = false;
          this.stepFinished.emit({state: 'train'});
        } else if (status.state === 'FAILURE') {
          this.resetPoller();

          const alert = await this.alertController.create({
            cssClass: 'wide-alert',
            header: 'Unable to Complete Training',
            message: `The following error was returned: <code>${status.status}</code>`,
            buttons: ['Dismiss']
          });

          await alert.present();
          this.reset.emit();
        } else if (status.state === 'REVOKED') {
          this.resetPoller();

          this.reset.emit();
        }
      }
    );
  }

  private async showError(message) {
    const toast = await this.toastController.create({message, duration: 2000});
    await toast.present();
  }
}
