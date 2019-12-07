import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { BackendService } from '../../services/backend.service';

@Component({
  selector: 'app-use-model',
  templateUrl: './use-model.component.html',
  styleUrls: ['./use-model.component.scss'],
})
export class UseModelComponent implements OnInit {
  @Input() features: string;
  @Input() publishName: string;
  parsedFeatures: string[];
  testForm: FormGroup;
  result;

  constructor(
    private backend: BackendService,
    private formBuilder: FormBuilder,
  ) {}

  ngOnInit() {
    this.parsedFeatures = JSON.parse(this.features.replace(/'/g, '"'));

    this.testForm = this.formBuilder.group({
      inputs: this.formBuilder.array(
        new Array(this.parsedFeatures.length).fill(['', Validators.required])
      )
    });
  }

  testModel() {
    let observable;
    const data = new FormData();
    data.append('data', this.testForm.get('inputs').value);
    data.append('features', JSON.stringify(this.parsedFeatures));

    if (this.publishName) {
      observable = this.backend.testPublishedModel(data, this.publishName);
    } else {
      observable = this.backend.testModel(data);
    }

    observable.subscribe(
      (result) => {
        this.result = result;
      },
      () => {
        this.result = undefined;
      }
    );
  }

  exportModel() {
    window.open(this.backend.exportModel, '_self');
  }

  exportPMML() {
    window.open(this.backend.exportPMML, '_self');
  }
}
