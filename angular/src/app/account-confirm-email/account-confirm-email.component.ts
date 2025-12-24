import {Component, OnInit} from '@angular/core';
import {BasicError, ExternalAuthProvider, User} from "../models";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {AccountService} from "../account.service";
import {FormsModule, NgForm} from "@angular/forms";
import {finalize} from "rxjs/operators";
import {TitleService} from "../title.service";
import {NgClass, NgIf} from "@angular/common";
import {SameAsDirective} from "../same-as.directive";
import {StrongPasswordDirective} from "../strong-password.directive";

class SetPasswordForm {
  new_password: string | undefined;
  repeat_new_password: string | undefined;
}

@Component({
  selector: 'app-account-confirm-email',
  templateUrl: './account-confirm-email.component.html',
  imports: [
    FormsModule,
    NgClass,
    RouterLink,
    NgIf,
    SameAsDirective,
    StrongPasswordDirective
  ],
  styleUrls: ['./account-confirm-email.component.less']
})
export class AccountConfirmEmailComponent implements OnInit {
  error: BasicError | undefined;
  verifying: boolean | undefined;
  requesting: boolean | undefined;

  uid: number | undefined;
  user: User | undefined;
  token: string | undefined;
  form: SetPasswordForm = new SetPasswordForm();
  alreadyConfirmed: boolean | undefined;

  provider: ExternalAuthProvider | undefined;

  constructor(
    private accountService: AccountService,
    private route: ActivatedRoute,
    private router: Router,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('Confirm Email');

    let params = this.route.snapshot.queryParams;
    this.uid = params['uid'] ? parseInt(params['uid']) : undefined;
    this.token = params['token'];

    if (this.uid === undefined || isNaN(this.uid) || this.token === undefined) {
      return
    }

    this.verifying = true;
    this.accountService.confirm_email(this.uid, this.token, null, true).pipe(
      finalize(() => this.verifying = false)
    ).subscribe({
      next: (user: User) => {
        this.user = user;
        if (user.external_auth_provider_id) {
          this.accountService.get_external_auth_provider(user.external_auth_provider_id).subscribe({
            next: provider => this.provider = provider,
            error: error => this.error = error.error
          })
        }
      },
      error: (error) => {
        if (error.error && error.error.msg === 'already confirmed') {
          this.alreadyConfirmed = true;
        } else {
          this.error = error.error;
        }
      }
    })
  }

  start_confirm(f: NgForm) {
    if (f.invalid || this.uid === undefined || isNaN(this.uid) || this.token === undefined)
      return;

    this.requesting = true;
    this.accountService.confirm_email(this.uid, this.token, this.form.new_password).pipe(
      finalize(() => this.requesting = false)
    ).subscribe({
      next: () => this.router.navigate(['/'], {replaceUrl: true}),
      error: (error) => this.error = error.error
    })
  }

}
