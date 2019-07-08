import {Component, OnInit} from '@angular/core';
import {BasicError, TwoFactorSetupInfo, User} from "../models";
import {finalize} from "rxjs/operators";
import {TitleService} from "../title.service";
import {AccountService} from "../account.service";
import {NgForm} from "@angular/forms";

@Component({
  selector: 'app-settings-two-factor',
  templateUrl: './settings-two-factor.component.html',
  styleUrls: ['./settings-two-factor.component.less']
})
export class SettingsTwoFactorComponent implements OnInit {
  error: BasicError;

  loading_user: boolean;
  user: User;

  setting_up: boolean;
  setup_info: TwoFactorSetupInfo;
  setup_info_expired: boolean;
  setup_info_expire_time = 55 * 1000;  // -5 seconds to ensure not expired

  confirming: boolean;
  confirm_token: string;

  show_disable_form: boolean;
  disabling: boolean;
  disable_token: string;

  constructor(private titleService: TitleService, private accountService: AccountService) {
  }

  ngOnInit() {
    this.titleService.setTitle('Profile', 'Two-Factor Authentication');

    this.loading_user = true;
    this.accountService.get_me().pipe(
      finalize(() => this.loading_user = false)
    ).subscribe(
      (user) => {
        this.user = user;
      },
      error => this.error = error.error
    )
  }

  setup(){
    this.setting_up = true;
    this.accountService.setup_two_factor().pipe(
      finalize(() => this.setting_up = false)
    ).subscribe(
      (info) => {
        this.setup_info = info;
        this.setup_info_expired = false;

        setTimeout(
          ()=>this.setup_info_expired = true,
          this.setup_info_expire_time
        )
      },
      error=>this.error = error.error
    )
  }

  confirmSetup(f: NgForm){
    if (f.invalid)
      return;

    this.confirming = true;
    this.accountService.confirm_setup_two_factor(this.confirm_token).pipe(
      finalize(()=>this.confirming = false)
    ).subscribe(
      ()=>{
        this.user.is_two_factor_enabled = true;
        this.setup_info = undefined;
        this.show_disable_form = false;
      },
      error=>this.error = error.error
    )
  }

  disable(f: NgForm){
    if (f.invalid)
      return;

    this.disabling = true;
    this.accountService.disable_two_factor(this.disable_token).pipe(
      finalize(()=>this.disabling = false)
    ).subscribe(
      ()=>{
        this.user.is_two_factor_enabled = false;
      },
      error=>this.error = error.error
    )
  }

}
