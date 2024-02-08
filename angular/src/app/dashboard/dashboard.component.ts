import {Component, OnInit} from '@angular/core';
import {environment} from '../../environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.less']
})
export class DashboardComponent implements OnInit {
  readonly env = environment;
  constructor() {
  }

  ngOnInit() {
  }
}
