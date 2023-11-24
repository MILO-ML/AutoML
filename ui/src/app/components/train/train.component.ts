import { Component, Input, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { of, ReplaySubject } from 'rxjs';
import { catchError, delay, repeat, takeUntil, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { TaskAdded } from '../../interfaces';
import * as pipelineOptions from '../../data/pipeline.processors.json';
import { TextareaModalComponent } from '../../components/textarea-modal/textarea-modal.component';
import { MiloApiService } from '../../services/milo-api/milo-api.service';
import { requireAtLeastOneCheckedValidator } from '../../validators/at-least-one-checked.validator';
import { AngularFireAnalytics } from '@angular/fire/compat/analytics';

@Component({
  selector: 'app-train',
  templateUrl: 'train.component.html',
  styleUrls: ['train.component.scss']
})
export class TrainComponent implements OnDestroy, OnInit {
  @Input() featureCount;
  @Input() parameters;
  @Output() resetState = new EventEmitter();
  @Output() stepFinished = new EventEmitter();

  destroy$: ReplaySubject<boolean> = new ReplaySubject<boolean>();
  allPipelines;
  showAdvanced = !environment.production && !this.api.isTrial;
  ldapAuth = environment.ldapAuth === 'true';
  defaultHyperParameters = {grid: {}, random: {}};
  training = false;
  trainForm: FormGroup;
  pipelineProcessors = (pipelineOptions as any).default;

  constructor(
    public api: MiloApiService,
    private alertController: AlertController,
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private analytics: AngularFireAnalytics ,

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

    this.api.events.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event === 'trial_update') {
        this.updateForTrial();
      }
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

    this.updateForTrial();

    if (this.featureCount && this.featureCount < 3) {
      const features = this.trainForm.get('featureSelectors');
      const disabledValues = new Array(features.value.length).fill(0);

      /** Enable the `None` feature selector */
      disabledValues[0] = 1;
      features.setValue(disabledValues);
      features.disable();
    }
  }

  ngOnDestroy() {
    this.destroy$.next(true);
  }

  async startTraining() {
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

    (await this.api.startTraining(formData)).subscribe(
      (task: TaskAdded) => {
        this.allPipelines = task.pipelines;
        this.checkStatus(task.id);
        this.pushStateStatus(task.id);
        this.analytics.logEvent('training_started', {
          parms: JSON.stringify(this.trainForm.value)
         })
      },
      async () => {
        const alert = await this.alertController.create({
          header: 'Unable to Start Training',
          message: 'Please make sure the backend is reachable and try again.',
          buttons: ['Dismiss']
        });
       
        this.resetState.emit();
        await alert.present();
      }
    );

    localStorage.setItem('training-options', JSON.stringify(this.trainForm.value));
  }

  async startMonitor(taskId) {
    this.pushStateStatus(taskId);
    this.training = true;

    (await this.api.getPipelines()).subscribe(
      (pipelines) => {
        this.allPipelines = pipelines;
        this.checkStatus(taskId);
      }
    );
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

  private updateForTrial() {
    if (this.api.isTrial) {
      this.setValues('estimators', [
        ...new Set([
          ...this.pipelineProcessors.estimators.filter(i => !i.trial).map(i => i.value),
          ...this.parameters?.ignore_estimator?.split(',') ?? []
        ])]);
      this.setValues('scalers', [...new Set([
        ...this.pipelineProcessors.scalers.filter(i => !i.trial).map(i => i.value),
        ...this.parameters?.ignore_scaler?.split(',') ?? []
      ])]);
      this.setValues('featureSelectors', [...new Set([
        ...this.pipelineProcessors.featureSelectors.filter(i => !i.trial).map(i => i.value),
        ...this.parameters?.ignore_feature_selector?.split(',') ?? []
      ])]);
      this.setValues('searchers', [...new Set([
        ...this.pipelineProcessors.searchers.filter(i => !i.trial).map(i => i.value),
        ...this.parameters?.ignore_searcher?.split(',') ?? []
      ])]);
      this.setValues('scorers', [...new Set([
        ...this.pipelineProcessors.scorers.filter(i => !i.trial).map(i => i.value),
        ...this.parameters?.ignore_scorer?.split(',') ?? []
      ])]);
    }
  }

  private async checkStatus(taskId) {
    (await this.api.getTaskStatus(taskId)).pipe(
      catchError(_ => of(false)),
      takeUntil(this.destroy$),
      tap(async (status) => {
        if (typeof status === 'boolean') {
          return;
        }

        if (status.state === 'SUCCESS') {
          this.training = false;
          this.stepFinished.emit({nextStep: 'result'});
        } else if (status.state === 'FAILURE') {
          const alert = await this.alertController.create({
            cssClass: 'wide-alert',
            header: 'Unable to Complete Training',
            message: `The following error was returned: <code>${status.status}</code>`,
            buttons: ['Dismiss']
          });

          await alert.present();
          this.resetState.emit();
        } else if (status.state === 'REVOKED') {
          this.resetState.emit();
        }
      }),
      delay(60000),
      repeat()
    ).subscribe();
  }

  private async showError(message) {
    const toast = await this.toastController.create({message, duration: 2000});
    await toast.present();
  }

  private pushStateStatus(id) {
    window.history.pushState('', '', `/search/${this.api.currentDatasetId}/job/${this.api.currentJobId}/train/${id}/status`);
  }
}
