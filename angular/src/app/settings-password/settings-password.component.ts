import {Component, OnInit} from '@angular/core';
import {BasicError, ExternalAuthProvider, User} from "../models";
import {FormsModule, NgForm} from "@angular/forms";
import {AccountService} from "../account.service";
import {finalize} from "rxjs/operators";
import {TitleService} from "../title.service";
import {NgClass, NgIf} from "@angular/common";
import {StrongPasswordDirective} from "../strong-password.directive";
import {SameAsDirective} from "../same-as.directive";

class UpdatePasswordForm {
  old_password: string | undefined;
  new_password: string | undefined;
  repeat_new_password: string | undefined;
}

@Component({
  selector: 'app-settings-password',
  templateUrl: './settings-password.component.html',
  imports: [
    NgIf,
    NgClass,
    FormsModule,
    StrongPasswordDirective,
    SameAsDirective
  ],
  styleUrls: ['./settings-password.component.less']
})
export class SettingsPasswordComponent implements OnInit {
  user: User | undefined;
  provider: ExternalAuthProvider | undefined;

  updating_password: boolean | undefined;
  error: BasicError | undefined;
  success: boolean | undefined;

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

    this.accountService.get_current_user().subscribe({
      next: user => {
        this.user = user;
        if(user == null){
          return;
        }

        if (user.external_auth_provider_id) {
          this.accountService.get_external_auth_provider(user.external_auth_provider_id).subscribe({
            next: provider => this.provider = provider,
            error: error => this.error = error.error
          })
        }
      },
      error: error => this.error = error.error
    })
  }

  updatePassword(f: NgForm) {
    if (f.invalid)
      return;

    this.error = undefined;
    this.success = undefined;

    if (this.form.old_password === undefined || this.form.new_password === undefined) {
      return;
    }

    this.updating_password = true;
    this.accountService.update_password(this.form.old_password, this.form.new_password).pipe(
      finalize(() => this.updating_password = false)
    ).subscribe({
      next: () => this.success = true,
      error: (error) => this.error = error.error
    })
  }
}
