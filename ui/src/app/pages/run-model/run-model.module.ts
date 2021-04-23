import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { RunModelPageComponent } from './run-model.page';
import { UseModelModule } from '../../components/use-model/use-model.module';

const routes: Routes = [
  {
    path: '',
    component: RunModelPageComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    IonicModule,
    UseModelModule,
    RouterModule.forChild(routes)
  ],
  declarations: [RunModelPageComponent]
})
export class RunModelPageModule {}
