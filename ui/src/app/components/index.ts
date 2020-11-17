import { CommonModule, DatePipe } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { ExploreComponent } from './explore/explore.component';
import { FeatureAnalysisComponent } from './feature-analysis/feature-analysis.component';
import { FeatureDetailsComponent } from './feature-details/feature-details.component';
import { HistogramComponent } from './histogram/histogram.component';
import { MultiSelectMenuComponent } from './multi-select-menu/multi-select-menu.component';
import { PendingTasksComponent } from './pending-tasks/pending-tasks.component';
import { RadialDendrogramComponent } from './radial-dendrogram/radial-dendrogram.component';
import { ResultsComponent } from './results/results.component';
import { RocChartComponent } from './roc-chart/roc-chart.component';
import { TextareaModalComponent } from './textarea-modal/textarea-modal.component';
import { TrainComponent } from './train/train.component';
import { TuneModelComponent } from './tune-model/tune-model.component';
import { UploadComponent } from './upload/upload.component';
import { UseModelModule } from './use-model/use-model.module';

@NgModule( {
  declarations: [
    ExploreComponent,
    FeatureAnalysisComponent,
    FeatureDetailsComponent,
    HistogramComponent,
    MultiSelectMenuComponent,
    PendingTasksComponent,
    RadialDendrogramComponent,
    ResultsComponent,
    RocChartComponent,
    TextareaModalComponent,
    TrainComponent,
    TuneModelComponent,
    UploadComponent
  ],
  exports: [
    ExploreComponent,
    FeatureAnalysisComponent,
    FeatureDetailsComponent,
    HistogramComponent,
    MultiSelectMenuComponent,
    PendingTasksComponent,
    RadialDendrogramComponent,
    ResultsComponent,
    RocChartComponent,
    TextareaModalComponent,
    TrainComponent,
    TuneModelComponent,
    UploadComponent
  ],
  imports: [
      CommonModule,
      IonicModule,
      FormsModule,
      RouterModule,
      ReactiveFormsModule,
      MatCheckboxModule,
      MatInputModule,
      MatPaginatorModule,
      MatTableModule,
      MatSortModule,
      UseModelModule
  ],
  providers: [
    DatePipe
  ]
} )
export class ComponentsModule {}
export * from './pending-tasks/pending-tasks.component';
export * from './use-model/use-model.component';
export * from './textarea-modal/textarea-modal.component';
export * from './train/train.component';
