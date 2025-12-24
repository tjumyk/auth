import { Component, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';
import {RouterOutlet} from "@angular/router";

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  imports: [
    RouterOutlet
  ],
  styleUrls: ['./landing.component.less']
})
export class LandingComponent implements OnInit {
  readonly env = environment;

  constructor() { }

  ngOnInit() {
  }

}
