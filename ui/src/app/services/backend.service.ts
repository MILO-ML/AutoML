import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { v4 as uuid } from 'uuid';

import { GeneralizationResult } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  currentJobId;
  previousJobs;
  userData;
  SERVER_URL = 'http://localhost:5000';

  constructor(
    private http: HttpClient,
  ) {
    let userData;
    try {
      userData = JSON.parse(localStorage.getItem('userData'));

      if (userData === null) {
        throw new Error('No user data found');
      }

      this.updatePreviousJobs(userData.id);
    } catch (err) {
      userData = {
        id: uuid()
      };
    }

    localStorage.setItem('userData', JSON.stringify(userData));
    this.userData = userData;
  }

  submitData(formData) {
    this.currentJobId = uuid();
    return this.http.post<any>(this.SERVER_URL + '/upload/' + this.userData.id + '/' + this.currentJobId, formData);
  }

  startTraining(formData) {
    return this.http.post(this.SERVER_URL + '/train/' + this.userData.id + '/' + this.currentJobId, formData);
  }

  getResults() {
    return this.http.get<GeneralizationResult[]>(this.SERVER_URL + '/results/' + this.userData.id + '/' + this.currentJobId);
  }

  createModel(formData) {
    return this.http.post(this.SERVER_URL + '/create/' + this.userData.id + '/' + this.currentJobId, formData);
  }

  testModel(formData) {
    return this.http.post(this.SERVER_URL + '/test/' + this.userData.id + '/' + this.currentJobId, formData);
  }

  get exportCSV() {
    return this.SERVER_URL + '/export/' + this.userData.id + '/' + this.currentJobId;
  }

  get exportModel() {
    return this.SERVER_URL + '/export-model/' + this.userData.id + '/' + this.currentJobId;
  }

  get exportPMML() {
    return this.SERVER_URL + '/export-pmml/' + this.userData.id + '/' + this.currentJobId;
  }

  private updatePreviousJobs(id) {
    this.http.get(this.SERVER_URL + '/list-jobs/' + id).subscribe(result => {
      this.previousJobs = result;
    });
  }
}
