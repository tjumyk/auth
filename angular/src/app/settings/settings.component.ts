import {Component, OnInit} from '@angular/core';
import {AccountService} from "../account.service";
import {TitleService} from "../title.service";
import {RouterLink, RouterLinkActive, RouterOutlet} from "@angular/router";

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],
  styleUrls: ['./settings.component.less']
})
export class SettingsComponent implements OnInit {
  is_admin: boolean = false;

  constructor(
    private accountService: AccountService,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('Settings');

    this.accountService.get_current_user().subscribe({
      next: (user) => {
        if(user == null){
          return;
        }
        if (user.groups) {
          for (let group of user.groups) {
            if (group.name == 'admin') {
              this.is_admin = true;
              break;
            }
          }
        }
      }
    })
  }
}
