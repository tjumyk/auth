import { Component, OnInit } from '@angular/core';
import {TitleService} from "../title.service";
import {MetaService} from "../meta.service";
import {VersionInfo} from "../models";
import {NgIf} from "@angular/common";

import {environment} from "../../environments/environment";

@Component({
  selector: 'app-admin-about',
  templateUrl: './admin-about.component.html',
  imports: [
    NgIf
  ],
  styleUrls: ['./admin-about.component.less']
})
export class AdminAboutComponent implements OnInit {
  version: VersionInfo | undefined;
  readonly env = environment;

  constructor(
    private titleService: TitleService,
    private metaService: MetaService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('About', 'Management');
    this.metaService.getVersion().subscribe({
      next: v=> this.version = v
    })
  }

}
