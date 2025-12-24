import { Component, OnInit } from '@angular/core';
import {TitleService} from "../title.service";
import {RouterLink, RouterLinkActive, RouterOutlet} from "@angular/router";

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],
  styleUrls: ['./admin.component.less']
})
export class AdminComponent implements OnInit {

  constructor(
    private titleService: TitleService
  ) { }

  ngOnInit() {
    this.titleService.setTitle('Management')
  }

}
