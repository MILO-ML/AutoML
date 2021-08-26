import { Component } from '@angular/core';

import { version } from '../../../../../package.json';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePageComponent {
  version = version;
}
