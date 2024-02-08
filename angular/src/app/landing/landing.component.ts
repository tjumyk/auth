import { Component, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.less']
})
export class LandingComponent implements OnInit {
  readonly env = environment;

  constructor() { }

  ngOnInit() {
  }

}
