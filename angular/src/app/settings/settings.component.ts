import {Component, OnInit} from '@angular/core';
import {AccountService} from "../account.service";

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.less']
})
export class SettingsComponent implements OnInit {
  is_admin: boolean = false;

  constructor(private accountService: AccountService) {
  }

  ngOnInit() {
    this.accountService.get_current_user().subscribe(
      (user) => {
        for (let group of user.groups) {
          if (group.name == 'admin') {
            this.is_admin = true;
            break;
          }
        }
      }
    )
  }
}
