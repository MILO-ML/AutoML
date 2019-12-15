import { Component, Input, ViewChild, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';

import * as pipelineOptions from '../../interfaces/pipeline.processors.json';
import { BackendService } from '../../services/backend.service';
import { GeneralizationResult, MetaData } from '../../interfaces';
import { UseModelComponent } from '../use-model/use-model.component';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss'],
})
export class ResultsComponent implements OnChanges {
  @Input() isActive: boolean;
  activeRow = 0;
  data: GeneralizationResult[];
  filterForm: FormGroup;
  loading: HTMLIonLoadingElement;
  rocData;
  metadata: MetaData;
  sortedData: GeneralizationResult[];
  trainingRocData;
  results: MatTableDataSource<GeneralizationResult>;
  columns: {key: string; class?: string, name: string; number?: boolean, hideMobile?: boolean}[] = [
    {
      key: 'estimator',
      name: 'Estimator'
    },
    {
      key: 'auc',
      name: 'Sn+Sp',
      class: 'overline',
      number: true
    },
    {
      key: 'roc_auc',
      name: 'ROC AUC',
      number: true
    },
    {
      key: 'accuracy',
      name: 'Accuracy',
      number: true
    },
    {
      key: 'f1',
      name: 'F1',
      number: true
    },
    {
      key: 'sensitivity',
      name: 'Sensitivity',
      number: true
    },
    {
      key: 'specificity',
      name: 'Specificity',
      number: true
    },
    {
      key: 'brier_score',
      name: 'Brier Score',
      number: true
    },
    {
      key: 'scaler',
      name: 'Scaler',
      hideMobile: true
    },
    {
      key: 'feature_selector',
      name: 'Feature Selector',
      hideMobile: true
    },
    {
      key: 'scorer',
      name: 'Scorer',
      hideMobile: true
    },
    {
      key: 'searcher',
      name: 'Searcher',
      hideMobile: true
    },
    {
      key: 'actions',
      name: ''
    }
  ];

  @ViewChild(MatSort, {static: false}) sort: MatSort;

  constructor(
    private alertController: AlertController,
    private backend: BackendService,
    private formBuilder: FormBuilder,
    private loadingController: LoadingController,
    private modalController: ModalController,
    private toastController: ToastController,
  ) {
    this.filterForm = this.formBuilder.group({
      query: new FormControl(''),
      group: new FormControl('all')
    });
  }

  ngOnChanges() {
    if (!this.isActive) {
      return;
    }

    this.backend.getResults().subscribe(
      data => {
        this.data = data.results;
        this.metadata = data.metadata;
        this.results = new MatTableDataSource(data.results);
        setTimeout(() => {
          this.results.sort = this.sort;
          this.results.filterPredicate = this.filter.bind(this);
        }, 1);

        this.results.connect().subscribe(d => {
          this.sortedData = d;
        });
     },
      async () => {
        const alert = await this.alertController.create({
          header: 'Unable to Load Results',
          message: 'Please make sure the backend is reachable and try again.',
          buttons: ['Dismiss']
        });

        await alert.present();
      }
    );
  }

  getColumns() {
    const isMobile = window.innerWidth < 1350;
    return isMobile ? this.columns.filter(c => !c.hideMobile).map(c => c.key) : this.columns.map(c => c.key);
  }

  getFilterColumns() {
    return this.columns.filter(i => i.name);
  }

  filter(value, filter) {
    const group = this.filterForm.get('group').value;
    let dataStr;

    if (group === 'all') {
      dataStr = Object.keys(value).reduce((currentTerm: string, key: string) => {
        return currentTerm + (value as {[key: string]: any})[key] + '◬';
      }, '').toLowerCase();
    } else {
      dataStr = value[group].toLowerCase();
    }
    const transformedFilter = filter.trim().toLowerCase();

    return dataStr.indexOf(transformedFilter) !== -1;
  }

  applyFilter() {
    this.results.filter = this.filterForm.get('query').value;
  }

  parse(object, mode) {
    let fpr;
    let tpr;
    let upper;
    let lower;
    const textElements = [
      'Estimator: ' + object.estimator,
      'Scaler: ' + object.scaler,
      'Selector: ' + object.feature_selector,
      'Scorer: ' + object.scorer,
      'Searcher: ' + object.searcher
    ];

    if (mode === 'generalization') {
      fpr = JSON.parse(object.generalization_fpr);
      tpr = JSON.parse(object.generalization_tpr);
    } else if (mode === 'reliability') {
      fpr = JSON.parse(object.mpv);
      tpr = JSON.parse(object.fop);
    } else if (mode === 'mean') {
      fpr = JSON.parse(object.mean_fpr);
      tpr = JSON.parse(object.mean_tpr);
      upper = JSON.parse(object.mean_upper);
      lower = JSON.parse(object.mean_lower);
    } else if (mode === 'test') {
      fpr = JSON.parse(object.test_fpr);
      tpr = JSON.parse(object.test_tpr);
    } else {
      return;
    }

    if (mode === 'reliability') {
      textElements.push('Brier Score: ' + object.brier_score.toFixed(4));
    } else {
      textElements.push('AUC = ' + this.calculateArea(tpr, fpr) + (mode === 'mean' ? ' ± ' + object.std_auc.toFixed(4) : ''));
    }

    return {
      fpr,
      tpr,
      upper,
      lower,
      textElements
    };
  }

  async beginPublish(index: number) {
    const model = this.sortedData[index];

    const alert = await this.alertController.create({
      cssClass: 'wide-alert',
      header: 'Publish Model',
      subHeader: 'Publish your model for standalone use',
      message: `Once published, the model will be available at ${location.origin}/&lt;name&gt;.`,
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Enter the name of your model'
        }
      ],
      buttons: [
        'Dismiss',
        {
          text: 'Publish',
          handler: (data) => {
            if (!data.name || !data.name.match(/^[!#$&-;=?-[\]_a-z~]+$/)) {
              this.showError('Invalid characters detected, please use an alphanumeric name.');
              return false;
            }

            this.publishModel(model, data.name);
          }
        }
      ]
    });

    alert.present();
  }

  async publishModel(model, name) {
    await this.presentLoading();
    const formData = new FormData();
    formData.append('publishName', name);
    formData.append('key', model.key);
    formData.append('parameters', model.best_params);
    formData.append('features', model.selected_features);
    this.backend.createModel(formData).subscribe(
      async () => {
        const alert = await this.alertController.create({
          buttons: ['Dismiss'],
          cssClass: 'wide-alert',
          header: 'Your model has been published!',
          message: `You may now access your model here:
            <a class='external-link' href='${location.origin}/model/${name}'>${location.origin}/model/${name}</a>`
        });
        await alert.present();
        this.loading.dismiss();
      },
      async () => {
        await this.showError('Unable to publish the model.');
        this.loading.dismiss();
      }
    );
  }

  launchModel(index: number) {
    this.presentLoading();
    const formData = new FormData();
    formData.append('key', this.sortedData[index].key);
    formData.append('parameters', this.sortedData[index].best_params);
    formData.append('features', this.sortedData[index].selected_features);

    this.backend.createModel(formData).subscribe(
      async () => {
        const modal = await this.modalController.create({
          component: UseModelComponent,
          cssClass: 'test-model',
          componentProps: {
            features: this.sortedData[index].selected_features
          }
        });
        await modal.present();
        this.loading.dismiss();
      },
      async () => {
        const toast = await this.toastController.create({
          message: 'Unable to create the model.',
          duration: 2000
        });
        toast.present();
        this.loading.dismiss();
      }
    );
  }

  async showDetails() {
    let alert;

    if (this.metadata) {
      const fitDetails = pipelineOptions.estimators.map(estimator => {
        if (!this.metadata.fits[estimator.value]) {
          return '';
        }

        return `
          <ion-item>
            <ion-label>${estimator.label}</ion-label>
            <ion-note slot='end'>${this.metadata.fits[estimator.value]}</ion-note>
          </ion-item>
        `;
      }).join('');

      const message = `
        <ion-list>
          <ion-item>
            <ion-label>Total Models: ${Object.values(this.metadata.fits).reduce((a, b) => a + b, 0)}</ion-label>
            <ion-list>
              ${fitDetails}
            </ion-list>
          </ion-item>
          <ion-item>
            <ion-label>Training Positive Cases</ion-label>
            <ion-note slot='end'>${this.metadata.train_positive_count}</ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Training Negative Cases</ion-label>
            <ion-note slot='end'>${this.metadata.train_negative_count}</ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Testing (Generalization) Positive Cases</ion-label>
            <ion-note slot='end'>${this.metadata.test_positive_count}</ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Testing (Generalization) Negative Cases</ion-label>
            <ion-note slot='end'>${this.metadata.test_negative_count}</ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Cross Validation Count</ion-label>
            <ion-note slot='end'>10</ion-note>
          </ion-item>
        </ion-list>
      `;

      alert = await this.alertController.create({
        cssClass: 'wide-alert',
        buttons: ['Dismiss'],
        header: 'Analysis Details',
        subHeader: 'Provided below are the details from the model training and validation',
        message
      });
    } else {
      alert = await this.alertController.create({
        buttons: ['Dismiss'],
        header: 'Analysis Details',
        message: 'This run does not contain the metadata needed to display analysis details.'
      });
    }

    await alert.present();
  }

  private calculateArea(tpr, fpr) {
    let area = 0.0;
    tpr.forEach((_, i) => {
      if ('undefined' !== typeof fpr[i - 1]) {
        area += (fpr[i] - fpr[i - 1]) * (tpr[i - 1] + tpr[i]) / 2;
      }
    });
    return area.toFixed(4);
  }

  private async presentLoading() {
    this.loading = await this.loadingController.create({
      message: 'Refitting selected model'
    });
    await this.loading.present();
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({message, duration: 2000});
    return toast.present();
  }
}