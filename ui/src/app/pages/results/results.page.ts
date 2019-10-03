import { Component, ViewChild, OnInit } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

import { BackendService } from '../../services/backend.service';

@Component({
  selector: 'app-results',
  templateUrl: './results.page.html',
  styleUrls: ['./results.page.scss'],
})
export class ResultsPage implements OnInit {
  data;
  results;
  displayedColumns: string[] = ['estimator', 'accuracy', 'auc', 'f1', 'sensitivity',
    'specificity', 'scaler', 'feature_selector', 'scorer', 'searcher'];

  @ViewChild(MatSort, {static: false}) sort: MatSort;

  constructor(
    private backend: BackendService,
  ) {}

  ngOnInit() {
    this.backend.getResults().subscribe(data => {
      this.data = data;
      this.results = new MatTableDataSource(data);
      setTimeout(() => {
        this.results.sort = this.sort;
      }, 1);
    });
  }
}
