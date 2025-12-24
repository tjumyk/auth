import {Component, OnDestroy, OnInit} from '@angular/core';
import {BasicError, TwoFactorSetupInfo, User} from "../models";
import {finalize} from "rxjs/operators";
import {TitleService} from "../title.service";
import {AccountService} from "../account.service";
import {FormsModule, NgForm} from "@angular/forms";
import {NgClass, NgIf} from "@angular/common";

@Component({
  selector: 'app-settings-two-factor',
  templateUrl: './settings-two-factor.component.html',
  imports: [
    NgIf,
    NgClass,
    FormsModule
  ],
  styleUrls: ['./settings-two-factor.component.less']
})
export class SettingsTwoFactorComponent implements OnInit, OnDestroy {
  error: BasicError | undefined;

  loading_user: boolean | undefined;
  user: User | undefined;

  setting_up: boolean | undefined;
  setup_info: TwoFactorSetupInfo | undefined;
  setup_info_expired: boolean | undefined;
  setup_info_expire_timer: number | undefined;
  setup_info_expire_time = 55 * 1000;  // -5 seconds to ensure not expired

  confirming: boolean | undefined;
  confirm_token: string | undefined;

  show_disable_form: boolean | undefined;
  disabling: boolean | undefined;
  disable_token: string | undefined;

  constructor(private titleService: TitleService, private accountService: AccountService) {
  }

  ngOnInit() {
    this.titleService.setTitle('Profile', 'Two-Factor Authentication');

    this.loading_user = true;
    this.accountService.get_me().pipe(
      finalize(() => this.loading_user = false)
    ).subscribe({
      next: (user) => {
        this.user = user;
      },
      error: error => this.error = error.error
    })
  }

  ngOnDestroy(): void {
    clearTimeout(this.setup_info_expire_timer);
  }

  setup() {
    this.setting_up = true;
    this.accountService.setup_two_factor().pipe(
      finalize(() => this.setting_up = false)
    ).subscribe({
      next: (info) => {
        this.setup_info = info;
        this.setup_info_expired = false;

        clearTimeout(this.setup_info_expire_timer);  // clear possible existing timer
        this.setup_info_expire_timer = setTimeout(
          () => this.setup_info_expired = true,
          this.setup_info_expire_time
        )
      },
      error: error => this.error = error.error
    })
  }

  confirmSetup(f: NgForm) {
    if (f.invalid || this.confirm_token === undefined)
      return;

    this.confirming = true;
    this.accountService.confirm_setup_two_factor(this.confirm_token).pipe(
      finalize(() => this.confirming = false)
    ).subscribe({
      next: () => {
        if (this.user) {
          this.user.is_two_factor_enabled = true;
        }
        this.setup_info = undefined;
        clearTimeout(this.setup_info_expire_timer);
        this.show_disable_form = false;
      },
      error: error => this.error = error.error
    })
  }

  disable(f: NgForm) {
    if (f.invalid)
      return;

    if (this.disable_token === undefined) {
      return;
    }

    this.disabling = true;
    this.accountService.disable_two_factor(this.disable_token).pipe(
      finalize(() => this.disabling = false)
    ).subscribe({
      next: () => {
        if (this.user) {
          this.user.is_two_factor_enabled = false;
        }
      },
      error: error => this.error = error.error
    })
  }

}
