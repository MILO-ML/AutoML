import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { v4 as uuid } from 'uuid';
import io from 'socket.io-client';

import { Results, TaskDetails, TaskStatus, PriorJobs, PublishedModels } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  currentJobId;
  userData;
  SERVER_URL = 'http://localhost:5000';
  socket = io(this.SERVER_URL);

  constructor(
    private http: HttpClient,
  ) {
    let userData;
    try {
      userData = JSON.parse(localStorage.getItem('userData'));

      if (userData === null) {
        throw new Error('No user data found');
      }
    } catch (err) {
      userData = {
        id: uuid()
      };
    }

    localStorage.setItem('userData', JSON.stringify(userData));
    this.userData = userData;
    this.socket.emit('list-jobs', this.userData.id);
    this.socket.on('list-jobs', d => console.log(d));
  }

  submitData(formData) {
    this.currentJobId = uuid();
    return this.http.post<any>(this.SERVER_URL + '/upload/' + this.userData.id + '/' + this.currentJobId, formData);
  }

  cloneJob(job) {
    this.currentJobId = uuid();
    return this.http.post(this.SERVER_URL + '/clone/' + this.userData.id + '/' + job + '/' + this.currentJobId, undefined);
  }

  startTraining(formData) {
    return this.http.post(this.SERVER_URL + '/train/' + this.userData.id + '/' + this.currentJobId, formData);
  }

  getTaskStatus(id: number) {
    return this.http.get<TaskStatus>(this.SERVER_URL + '/status/' + id);
  }

  cancelTask(id: number) {
    return this.http.delete(this.SERVER_URL + '/cancel/' + id);
  }

  getResults() {
    return this.http.get<Results>(this.SERVER_URL + '/results/' + this.userData.id + '/' + this.currentJobId);
  }

  getModelFeatures(model: string) {
    return this.http.get<string>(this.SERVER_URL + '/features/' + model);
  }

  createModel(formData) {
    return this.http.post(this.SERVER_URL + '/create/' + this.userData.id + '/' + this.currentJobId, formData);
  }

  unpublishModel(id: string) {
    return this.http.delete(this.SERVER_URL + '/unpublish/' + id);
  }

  testPublishedModel(data, publishName) {
    return this.http.post(this.SERVER_URL + '/test/' + publishName, data);
  }

  testModel(data) {
    return this.http.post(this.SERVER_URL + '/test/' + this.userData.id + '/' + this.currentJobId, data);
  }

  getPendingTasks() {
    return this.http.get<TaskDetails>(this.SERVER_URL + '/list-pending/' + this.userData.id);
  }

  getPriorJobs() {
    return this.http.get<PriorJobs[]>(this.SERVER_URL + '/list-jobs/' + this.userData.id);
  }

  getPublishedModels() {
    return this.http.get<PublishedModels>(this.SERVER_URL + '/list-published/' + this.userData.id);
  }

  exportCSV() {
    return this.SERVER_URL + '/export/' + this.userData.id + '/' + this.currentJobId;
  }

  exportModel() {
    return this.SERVER_URL + '/export-model/' + this.userData.id + '/' + this.currentJobId;
  }

  exportPMML() {
    return this.SERVER_URL + '/export-pmml/' + this.userData.id + '/' + this.currentJobId;
  }

  exportPublishedModel(publishName) {
    return this.SERVER_URL + '/export-model/' + publishName;
  }

  exportPublishedPMML(publishName) {
    return this.SERVER_URL + '/export-pmml/' + publishName;
  }
}
