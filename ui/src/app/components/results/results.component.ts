import { SelectionModel } from '@angular/cdk/collections';
import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AlertController, LoadingController, ModalController, ToastController, PopoverController } from '@ionic/angular';
import { saveAs } from 'file-saver';
import * as JSZip from 'jszip';
import * as saveSvgAsPng from 'save-svg-as-png';

import pipelineOptions from '../../data/pipeline.processors.json';
import { MiloApiService } from '../../services/milo-api/milo-api.service';
import { GeneralizationResult, MetaData, RefitGeneralization, Results } from '../../interfaces';
import { MultiSelectMenuComponent } from '../multi-select-menu/multi-select-menu.component';
import { TrainComponent } from '../train/train.component';
import { UseModelComponent } from '../use-model/use-model.component';
import { AngularFireAnalytics } from '@angular/fire/compat/analytics';


@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss'],
})
export class ResultsComponent implements OnInit {
  activeRow = 0;
  data: GeneralizationResult[];
  filterForm: FormGroup;
  loading: HTMLIonLoadingElement;
  rocData;
  metadata: MetaData;
  sortedData: GeneralizationResult[];
  trainingRocData;
  results: MatTableDataSource<GeneralizationResult>;
  selection = new SelectionModel<GeneralizationResult>(true, []);
  starred: string[];
  columns: {key: string; class?: string, name: string; number?: boolean, hideOnWidth?: number}[] = [
    {
      key: 'algorithm',
      name: 'Algorithm'
    },
    {
      key: 'roc_auc',
      name: 'ROC AUC',
      hideOnWidth: 375,
      number: true
    },
    {
      key: 'roc_delta',
      name: 'ΔROC AUC',
      hideOnWidth: 1400,
      number: true
    },
    {
      key: 'mcc',
      name: 'MCC',
      hideOnWidth: 375,
      number: true
    },
    {
      key: 'avg_sn_sp',
      name: 'Sn+Sp',
      class: 'overline',
      number: true
    },
    {
      key: 'accuracy',
      name: 'Accuracy',
      hideOnWidth: 400,
      number: true
    },
    {
      key: 'f1',
      name: 'F1',
      hideOnWidth: 1400,
      number: true
    },
    {
      key: 'sensitivity',
      name: 'Sensitivity',
      hideOnWidth: 600,
      number: true
    },
    {
      key: 'specificity',
      name: 'Specificity',
      hideOnWidth: 600,
      number: true
    },
    {
      key: 'npv',
      name: 'NPV',
      hideOnWidth: 600,
      number: true
    },
    {
      key: 'ppv',
      name: 'PPV',
      hideOnWidth: 600,
      number: true
    },
    {
      key: 'brier_score',
      name: 'Brier Score',
      hideOnWidth: 500,
      number: true
    },
    {
      key: 'scaler',
      name: 'Scaler',
      hideOnWidth: 1350
    },
    {
      key: 'feature_selector',
      name: 'Feature Selector',
      hideOnWidth: 1350
    },
    {
      key: 'scorer',
      name: 'Scorer',
      hideOnWidth: 1350
    },
    {
      key: 'searcher',
      name: 'Searcher',
      hideOnWidth: 1350
    },
    {
      key: 'actions',
      name: ''
    }
  ];

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    public api: MiloApiService,
    private alertController: AlertController,
    private formBuilder: FormBuilder,
    private loadingController: LoadingController,
    private modalController: ModalController,
    private toastController: ToastController,
    private popoverController: PopoverController,
    private analytics: AngularFireAnalytics ,

  ) {
    this.filterForm = this.formBuilder.group({
      query: new FormControl(''),
      group: new FormControl('all')
    });
  }

  async ngOnInit() {
    let data: Results;
    const loading = await this.loadingController.create({
      message: 'Loading results...'
    });
    await loading.present();

    try {
      data = await (await this.api.getResults()).toPromise();
      this.analytics.logEvent('results_view', {
        step_name: 'result',
       })
    } catch (err) {
      const alert = await this.alertController.create({
        header: 'Unable to Load Results',
        message: 'Please make sure the backend is reachable and try again.',
        buttons: ['Dismiss']
      });

      await loading.dismiss();
      await alert.present();
    }

    this.data = data.results;
    this.metadata = data.metadata;
    this.results = new MatTableDataSource(data.results);
    setTimeout(async () => {
      this.results.sort = this.sort;
      this.results.paginator = this.paginator;
      this.results.filterPredicate = this.filter.bind(this);
      await loading.dismiss();
    }, 1);

    this.results.connect().subscribe(d => {
      this.sortedData = d;
    });

    this.updateStarredModels();
  }

  getColumns() {
    return ['select', 'star', ...this.columns.filter(c => !c.hideOnWidth || window.innerWidth > c.hideOnWidth).map(c => c.key)];
  }

  getFilterColumns() {
    return this.columns.filter(i => i.name);
  }

  filter(value, filter) {
    if (filter === 'starred') {
      return this.starred.includes(value.key);
    } else if (filter === 'un-starred') {
      return !this.starred.includes(value.key);
    }

    const group = this.filterForm.get('group').value;
    let dataStr;

    if (group === 'all') {
      dataStr = Object.keys(value).reduce((currentTerm: string, key: string) => {
        return currentTerm + (value as {[key: string]: any})[key] + '◬';
      }, '').toLowerCase();
    } else {
      dataStr = value[group].toLowerCase();
    }


    return dataStr.indexOf(filter.trim().toLowerCase()) !== -1;
  }

  applyFilter() {
    this.results.filter = this.filterForm.get('query').value;
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.sortedData.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
        this.selection.clear() :
        this.sortedData.forEach(row => this.selection.select(row));
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: GeneralizationResult): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.key}`;
  }

  async toggleStar(key) {
    await (this.starred.includes(key) ? this.api.unStarModels : this.api.starModels).call(this.api, [key]);
    await this.updateStarredModels();
  }

  toggleStarFilter() {
    switch (this.results.filter) {
      case 'starred':
        this.results.filter = 'un-starred';
        break;
      case 'un-starred':
        this.results.filter = '';
        break;
      default:
        this.results.filter = 'starred';
    }
  }

  parse(object: GeneralizationResult, mode) {
    let fpr;
    let tpr;
    let upper;
    let lower;
    const textElements = [
      'Algorithm: ' + object.algorithm,
      'Scaler: ' + object.scaler,
      'Selector: ' + object.feature_selector,
      'Scorer: ' + object.scorer,
      'Searcher: ' + object.searcher
    ];

    if (mode === 'generalization') {
      fpr = JSON.parse(object.generalization_fpr);
      tpr = JSON.parse(object.generalization_tpr);
    } else if (mode === 'precision') {
      fpr = JSON.parse(object.recall);
      tpr = JSON.parse(object.precision);
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
    } else if (mode === 'precision') {
      textElements.push('F1: ' + object.f1.toFixed(4));
    } else if (mode === 'generalization') {
      textElements.push('AUC: ' + object.roc_auc.toFixed(4));
    } else if (mode === 'test') {
      if (object.training_roc_auc) {
        textElements.push('AUC: ' + object.training_roc_auc.toFixed(4));
      }
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
        },
        {
          name: 'threshold',
          type: 'number',
          min: .3,
          max: .7,
          placeholder: 'Decision threshold (.5 default)'
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

            if (data.threshold && (data.threshold < .3 || data.threshold > .7)) {
              this.showError('Invalid threshold detected, please use a value between .3 and .7.');
              return false;
            }

            this.publishModel(model, data.name, data.threshold || .5);
          }
        }
      ]
    });

    alert.present();
  }

  async publishModel(model, name, threshold) {
    await this.presentLoading();
    const formData = new FormData();
    formData.append('key', model.key);
    formData.append('parameters', model.best_params);
    formData.append('features', model.selected_features);
    formData.append('job', this.api.currentJobId);
    formData.append('threshold', threshold);
    formData.append('feature_scores', model.feature_scores);

    (await this.api.publishModel(name, formData)).subscribe(
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

  async launchModel(index: number) {
    await this.presentLoading();
    const formData = new FormData();
    formData.append('key', this.sortedData[index].key);
    formData.append('parameters', this.sortedData[index].best_params);
    formData.append('features', this.sortedData[index].selected_features);

    let scores;
    try {
      scores = JSON.parse(this.sortedData[index].feature_scores);
    } catch(e) {
      scores = {};
    }

    (await this.api.createModel(formData)).subscribe(
      async (reply: {generalization: RefitGeneralization}) => {
        const modal = await this.modalController.create({
          component: UseModelComponent,
          cssClass: 'test-modal',
          componentProps: {
            features: this.sortedData[index].selected_features,
            featureScores: scores,
            generalization: reply.generalization
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

    if (this.metadata && this.metadata.fits) {
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
            <ion-label>Target Column</ion-label>
            <ion-note slot='end'>${this.metadata.label}</ion-note>
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
            <ion-label>Cross Validation k-Fold</ion-label>
            <ion-note slot='end'>10</ion-note>
          </ion-item>
        </ion-list>
      `;

      alert = await this.alertController.create({
        cssClass: 'wide-alert',
        buttons: [
          {
            text: 'Download Performance Metrics',
            handler: () => {
              this.api.exportPerformanceCSV().then(url => window.open(url, '_self'));
              return false;
            },
            role: 'secondary'
          },
          'Dismiss'
        ],
        header: 'Analysis Details',
        subHeader: 'Provided below are the details from the model training and validation',
        message
      });
    } else {
      alert = await this.alertController.create({
        buttons: ['Dismiss'],
        header: 'Analysis Details',
        message: 'This run does not contain the metadata needed to display analysis details. This is likely due to an incomplete run.'
      });
    }

    await alert.present();
  }

  async showParameters() {
    const modal = await this.modalController.create({
      cssClass: 'wide-modal',
      component: TrainComponent,
      componentProps: {
        parameters: this.metadata.parameters
      }
    });

    await modal.present();
  }

  async openSelectedOptions(event) {
    const popover = await this.popoverController.create({
      component: MultiSelectMenuComponent,
      componentProps: {
        selected: this.selection.selected
      },
      event
    });
    await popover.present();
    const { data } = await popover.onWillDismiss();
    if (data && data.starred) {
      await this.updateStarredModels();
    }
  }

  async saveCurves() {
    const curves = document.querySelectorAll('app-roc-chart');
    const zip = new JSZip();

    for (let i = 0; i < curves.length; i++) {
      const name = curves[i].getAttribute('mode');
      const image = await saveSvgAsPng.svgAsPngUri(curves[i].querySelector('.roc'), {backgroundColor: 'white'});
      zip.file(name + '.png', image.split(',')[1], {base64: true});
    }

    saveAs(
      await zip.generateAsync({type: 'blob'}),
      `${this.sortedData[this.activeRow].key}_graphs.zip`
    );
  }

  private async updateStarredModels() {
    try {
      this.starred = await this.api.getStarredModels();
    } catch (err) {
      this.starred = [];
    }

    if (['starred', 'un-starred'].includes(this.results?.filter)) {
      this.results.filter = this.results.filter;
    }
  }

  private async presentLoading() {
    this.loading = await this.loadingController.create({
      message: 'Refitting selected model...'
    });
    await this.loading.present();
  }

  private async showError(message: string) {
    const toast = await this.toastController.create({message, duration: 2000});
    return toast.present();
  }
}
