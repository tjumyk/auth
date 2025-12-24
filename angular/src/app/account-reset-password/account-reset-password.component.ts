import {Component, OnInit} from '@angular/core';
import {BasicError, User} from "../models";
import {AccountService} from "../account.service";
import {ActivatedRoute, RouterLink} from "@angular/router";
import {finalize} from "rxjs/operators";
import {FormsModule, NgForm} from "@angular/forms";
import {TitleService} from "../title.service";
import {NgClass, NgIf} from "@angular/common";
import {SameAsDirective} from "../same-as.directive";

class ResetPasswordForm {
  new_password: string | undefined;
  repeat_new_password: string | undefined;
}

@Component({
  selector: 'app-account-reset-password',
  templateUrl: './account-reset-password.component.html',
  imports: [
    NgIf,
    RouterLink,
    NgClass,
    FormsModule,
    SameAsDirective
  ],
  styleUrls: ['./account-reset-password.component.less']
})
export class AccountResetPasswordComponent implements OnInit {
  error: BasicError | undefined;
  verifying: boolean | undefined;
  resetting: boolean | undefined;
  success: boolean | undefined;

  uid: number | undefined;
  user: User | undefined;
  token: string | undefined;
  form: ResetPasswordForm = new ResetPasswordForm();

  constructor(
    private accountService: AccountService,
    private titleService: TitleService,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('Reset Password');

    let params = this.route.snapshot.queryParams;
    this.uid = params['uid'] ? parseInt(params['uid']) : undefined;
    this.token = params['token'];

    if (this.uid === undefined || isNaN(this.uid) || this.token === undefined) {
      return
    }

    this.verifying = true;
    this.accountService.reset_password(this.uid, this.token, null, true).pipe(
      finalize(() => this.verifying = false)
    ).subscribe({
      next: (user) => this.user = user,
      error: (error) => this.error = error.error
    })
  }

  start_reset(f: NgForm) {
    if (f.invalid || this.uid === undefined || this.token === undefined || this.form.new_password === undefined)
      return;

    this.resetting = true;
    this.accountService.reset_password(this.uid, this.token, this.form.new_password).pipe(
      finalize(() => this.resetting = false)
    ).subscribe({
      next: () => this.success = true,
      error: (error) => this.error = error.error
    })
  }

}
