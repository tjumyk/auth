import {Component, OnInit} from '@angular/core';
import {BasicError, ExternalAuthProvider, User} from "../models";
import {NgForm} from "@angular/forms";
import {AccountService} from "../account.service";
import {finalize} from "rxjs/operators";
import {TitleService} from "../title.service";

class UpdatePasswordForm {
  old_password: string;
  new_password: string;
  repeat_new_password: string;
}

@Component({
  selector: 'app-settings-password',
  templateUrl: './settings-password.component.html',
  styleUrls: ['./settings-password.component.less']
})
export class SettingsPasswordComponent implements OnInit {
  user: User;
  provider: ExternalAuthProvider;

  updating_password: boolean;
  error: BasicError;
  success: boolean;

  form: UpdatePasswordForm = {
    old_password: undefined,
    new_password: undefined,
    repeat_new_password: undefined
  };

  constructor(
    private accountService: AccountService,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('Password', 'Settings');

    this.accountService.get_current_user().subscribe(
      user => {
        this.user = user;

        if (user.external_auth_provider_id) {
          this.accountService.get_external_auth_provider(user.external_auth_provider_id).subscribe(
            provider => this.provider = provider,
            error => this.error = error.error
          )
        }
      },
      error => this.error = error.error
    )
  }

  updatePassword(f: NgForm) {
    if (f.invalid)
      return;

    this.error = undefined;
    this.success = undefined;
    this.updating_password = true;
    this.accountService.update_password(this.form.old_password, this.form.new_password).pipe(
      finalize(() => this.updating_password = false)
    ).subscribe(
      () => this.success = true,
      (error) => this.error = error.error
    )
  }
}
