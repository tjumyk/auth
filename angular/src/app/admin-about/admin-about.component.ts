import { Component, OnInit } from '@angular/core';
import {TitleService} from "../title.service";
import {MetaService} from "../meta.service";
import {VersionInfo} from "../models";

@Component({
  selector: 'app-admin-about',
  templateUrl: './admin-about.component.html',
  styleUrls: ['./admin-about.component.less']
})
export class AdminAboutComponent implements OnInit {
  version: VersionInfo;

  constructor(
    private titleService: TitleService,
    private metaService: MetaService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('About', 'Management');
    this.metaService.getVersion().subscribe(
      v=> this.version = v
    )
  }

}
