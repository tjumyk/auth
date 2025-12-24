import {Component, OnInit} from '@angular/core';
import {AccountService} from "../account.service";
import {BasicError, User} from "../models";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {finalize} from "rxjs/operators";
import {FormsModule, NgForm} from "@angular/forms";
import {TitleService} from "../title.service";
import {TwoFactorLoginBoxComponent} from "../two-factor-login-box/two-factor-login-box.component";
import {NgClass, NgIf} from "@angular/common";

class LoginForm {
  name_or_email: string | undefined;
  password: string | undefined;
  remember: boolean = false;
}

@Component({
  selector: 'app-account-login',
  templateUrl: './account-login.component.html',
  imports: [
    TwoFactorLoginBoxComponent,
    FormsModule,
    NgClass,
    RouterLink,
    NgIf
  ],
  styleUrls: ['./account-login.component.less']
})
export class AccountLoginComponent implements OnInit {
  verifying_logged_in: boolean | undefined;
  logging_in: boolean | undefined;
  error: BasicError | undefined;

  show_two_factor: boolean | undefined;

  form: LoginForm = {
    name_or_email: undefined,
    password: undefined,
    remember: false
  };

  constructor(
    private accountService: AccountService,
    private router: Router,
    private route: ActivatedRoute,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('Sign In');

    this.error = undefined;
    this.verifying_logged_in = true;
    this.accountService.get_current_user().pipe(
      finalize(() => this.verifying_logged_in = false)
    ).subscribe({
      next: user => {
        if (user != null) {
          this.afterLogin(user)
        }
      },
      error: error => this.error = error.error
    })
  }

  login(f: NgForm): void {
    if (f.invalid || this.form.name_or_email === undefined || this.form.password === undefined)
      return;

    this.error = undefined;
    this.logging_in = true;
    this.accountService.login(this.form.name_or_email, this.form.password, this.form.remember).pipe(
      finalize(() => this.logging_in = false)
    ).subscribe({
      next: (user: User) => {
        if (user.is_two_factor_enabled) {
          this.show_two_factor = true;
        } else {
          this.afterLogin(user)
        }
      },
      error: (error) => this.error = error.error
    });
  }

  afterLogin(user: User) {
    let redirect = this.route.snapshot.queryParamMap.get('redirect') || "/";
    this.router.navigate([redirect], {replaceUrl: true})
  }
}
