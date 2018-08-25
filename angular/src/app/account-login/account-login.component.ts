import {Component, OnInit} from '@angular/core';
import {AccountService} from "../account.service";
import {BasicError, User} from "../models";
import {ActivatedRoute, Router} from "@angular/router";
import {finalize} from "rxjs/operators";
import {NgForm} from "@angular/forms";
import {TitleService} from "../title.service";

class LoginForm {
  name_or_email: string;
  password: string;
  remember: boolean = false;
}

@Component({
  selector: 'app-account-login',
  templateUrl: './account-login.component.html',
  styleUrls: ['./account-login.component.less']
})
export class AccountLoginComponent implements OnInit {
  verifying_logged_in: boolean;
  logging_in: boolean;
  error: BasicError;

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
    ).subscribe(
      user => {
        if (user != null) {
          let redirect = this.route.snapshot.queryParamMap.get('redirect') || "/";
          this.router.navigate([redirect], {replaceUrl: true});
        }
      },
      error => this.error = error.error
    )
  }

  login(f: NgForm): void {
    if (f.invalid)
      return;

    this.error = undefined;
    this.logging_in = true;
    this.accountService.login(this.form.name_or_email, this.form.password, this.form.remember).pipe(
      finalize(() => this.logging_in = false)
    ).subscribe(
      (user: User) => {
        let redirect = this.route.snapshot.queryParamMap.get('redirect') || "/";
        this.router.navigate([redirect], {replaceUrl: true})
      },
      (error) => this.error = error.error
    );
  }
}
