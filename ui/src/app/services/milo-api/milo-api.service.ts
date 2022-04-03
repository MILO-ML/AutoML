import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { catchError, map } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { v4 as uuid } from 'uuid';

import {
  ActiveTaskStatus,
  AdditionalGeneralization,
  DataAnalysisReply,
  DataSets,
  Jobs,
  PendingTasks,
  PublishedModels,
  TestReply,
  Results,
  RefitGeneralization
} from '../../interfaces';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MiloApiService {
  isEducation = false;
  isTrial = false;
  currentJobId: string;
  currentDatasetId: string;
  localUser: string;
  events = new EventEmitter<string>();

  constructor(
    private afAuth: AngularFireAuth,
    private http: HttpClient
  ) {
    this.afAuth.authState.subscribe(user => {
      if (!user && !environment.localUser) {
        this.currentDatasetId = undefined;
        this.currentJobId = undefined;
        return;
      }

      /** If the environment is setup for local user, log out the user */
      if (environment.localUser) {
        this.afAuth.signOut();
      }
    });

    try {
      this.localUser = localStorage.getItem('localUser') || uuid();
    } catch (err) {
      this.localUser = uuid();
    }

    try {
      localStorage.setItem('localUser', this.localUser);
    } catch (err) {}
  }

  async submitData(formData: FormData) {
    return (await this.request<{id: string}>(
      'post',
      `/datasets`,
      formData
    )).toPromise().then(reply => {
      this.currentDatasetId = reply.id;
    });
  }

  getDataAnalysis() {
    return this.request<DataAnalysisReply>(
      'get',
      `/datasets/${this.currentDatasetId}/describe`
    );
  }

  async createJob() {
    return (await this.request<{id: string; isTrial: boolean}>(
      'post',
      `/jobs`,
      {datasetid: this.currentDatasetId}
    )).toPromise().then(reply => {
      this.currentJobId = reply.id;
    });
  }

  deleteJob(id) {
    return this.request('delete', '/jobs/' + id);
  }

  deleteDataset(id) {
    return this.request('delete', '/datasets/' + id);
  }

  startTraining(formData) {
    return this.request(
      'post',
      `/jobs/${this.currentJobId}/train`,
      formData
    );
  }

  getPipelines() {
    return this.request(
      'get',
      `/jobs/${this.currentJobId}/pipelines`
    );
  }

  getTaskStatus(id: number) {
    return this.request<ActiveTaskStatus>('get', `/tasks/${id}`);
  }

  cancelTask(id) {
    return this.request('delete', `/tasks/${id}`);
  }

  getResults() {
    return this.request<Results>(
      'get',
      `/jobs/${this.currentJobId}/result`
    );
  }

  getModelFeatures(model: string) {
    return this.request<{features: string; feature_scores: string; generalization: RefitGeneralization; threshold: number}>('get', `/published/${model}/features`);
  }

  createModel(formData) {
    return this.request(
      'post',
      `/jobs/${this.currentJobId}/refit`,
      formData
    );
  }

  async createTandemModel(formData) {
    return await (await this.request('post', `/jobs/${this.currentJobId}/tandem`, formData)).toPromise();
  }

  async createEnsembleModel(formData) {
    return await (
      await this.request<{
        hard_generalization: RefitGeneralization,
        soft_generalization: RefitGeneralization
      }>('post', `/jobs/${this.currentJobId}/ensemble`, formData)
    ).toPromise();
  }

  publishModel(name, formData) {
    return this.request(
      'post',
      `/published/${name}`,
      formData
    );
  }

  deletePublishedModel(name: string) {
    return this.request('delete', '/published/' + name);
  }

  renamePublishedModel(name: string, newName: string) {
    return this.request('post', `/published/${name}/rename`, {
      name: newName
    });
  }

  testPublishedModel(data, publishName) {
    return this.request<TestReply>(
      'post',
      `/published/${publishName}/test`,
      data
    );
  }

  testModel(data) {
    return this.request<TestReply>(
      'post',
      `/jobs/${this.currentJobId}/test`,
      data
    );
  }

  async generalize(data, threshold) {
    return await (await this.request<AdditionalGeneralization>(
      'post',
      `/jobs/${this.currentJobId}/generalize`,
      {data, threshold},
    )).toPromise();
  }

  async generalizePublished(data, publishName) {
    return await (await this.request<AdditionalGeneralization>(
      'post',
      `/published/${publishName}/generalize`,
      data
    )).toPromise();
  }

  async testTandemModel(data) {
    return await (await this.request<TestReply>(
      'post',
      `/jobs/${this.currentJobId}/test-tandem`,
      data
    )).toPromise();
  }

  async testEnsembleModel(data) {
    return await (await this.request<TestReply>(
      'post',
      `/jobs/${this.currentJobId}/test-ensemble`,
      data
    )).toPromise();
  }

  getPendingTasks() {
    return this.request<PendingTasks>('get', `/tasks`);
  }

  getDataSets() {
    return this.request<DataSets[]>('get', '/datasets');
  }

  getJobs() {
    return this.request<Jobs[]>('get', '/jobs');
  }

  getPublishedModels() {
    return this.request<PublishedModels>('get', `/published`);
  }

  async getStarredModels() {
    return await (await this.request<string[]>('get', `/jobs/${this.currentJobId}/star-models`)).toPromise();
  }

  async starModels(models: string[]) {
    return await (await this.request<void>('post', `/jobs/${this.currentJobId}/star-models`, {models})).toPromise();
  }

  async unStarModels(models: string[]) {
    return await (await this.request<void>('post', `/jobs/${this.currentJobId}/un-star-models`, {models})).toPromise();
  }

  async exportCSV() {
    return `${environment.apiUrl}/jobs/${this.currentJobId}/export?${await this.getURLAuth()}`;
  }

  async exportPerformanceCSV() {
    return `${environment.apiUrl}/jobs/${this.currentJobId}/export-performance?${await this.getURLAuth()}`;
  }

  async exportModel(threshold: number) {
    return `${environment.apiUrl}/jobs/${this.currentJobId}/export-model?${await this.getURLAuth()}&threshold=${threshold}`;
  }

  async exportPMML() {
    return `${environment.apiUrl}/jobs/${this.currentJobId}/export-pmml?${await this.getURLAuth()}`;
  }

  async exportPublishedModel(publishName) {
    return `${environment.apiUrl}/published/${publishName}/export-model?${await this.getURLAuth()}`;
  }

  async exportPublishedPMML(publishName) {
    return `${environment.apiUrl}/published/${publishName}/export-pmml?${await this.getURLAuth()}`;
  }

  async activateLicense(license_code: string) {
    return await (await this.request<void>('post', `/license`, {license_code})).toPromise();
  }

  private async request<T>(method: string, url: string, body?: any) {
    return this.http.request<T>(
      method,
      environment.apiUrl + url,
      {
        body,
        headers: await this.getHttpHeaders(),
        observe: 'response'
      }
    ).pipe(
      catchError(error => {
        if (error.status === 402) {
          this.events.emit('license_error');
        }

        return throwError(error);
      }),
      map(response => {
        const trialHeader = response.headers.get('MILO-Trial');
        if (trialHeader !== null) {
          const isTrial = trialHeader === 'true';
          if (isTrial !== this.isTrial) {
            this.isTrial = isTrial;
            this.events.emit('trial_update');
          }
        }

        const educationHeader = response.headers.get('MILO-Education');
        if (educationHeader !== null) {
          const isEducation = educationHeader === 'true';
          if (isEducation !== this.isEducation) {
            this.isEducation = isEducation;
            this.events.emit('education_update');
          }
        }

        return response.body;
      })
    );
  }

  private async getHttpHeaders(): Promise<HttpHeaders> {
    return environment.localUser ?
      new HttpHeaders().set('LocalUserID', this.localUser) :
      new HttpHeaders().set('Authorization', `Bearer ${await (await this.afAuth.currentUser).getIdToken()}`);
  }

  private async getURLAuth(): Promise<string> {
    return environment.localUser ?
      `localUser=${this.localUser}` :
      `currentUser=${await (await this.afAuth.currentUser).getIdToken()}`;
  }
}
