import {Component, OnInit} from '@angular/core';
import {environment} from '../../environments/environment';
import {RouterOutlet} from "@angular/router";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [
    RouterOutlet
  ],
  styleUrls: ['./dashboard.component.less']
})
export class DashboardComponent implements OnInit {
  readonly env = environment;
  constructor() {
  }

  ngOnInit() {
  }
}
