import {Component, OnInit} from '@angular/core';
import {AccountService} from "../account.service";
import {ActivatedRoute, Router} from "@angular/router";
import {NgForm} from "@angular/forms";
import {BasicError, OAuthClient, User} from "../models";
import {finalize} from "rxjs/operators";
import {OauthService} from "../oauth.service";

class LoginForm {
  name_or_email: string;
  password: string;
  remember: boolean = false;
}

@Component({
  selector: 'app-oauth-login',
  templateUrl: './oauth-login.component.html',
  styleUrls: ['./oauth-login.component.less']
})
export class OauthLoginComponent implements OnInit {
  verifying_logged_in: boolean;
  starting_authorization: boolean;
  start_authorization_success: boolean;
  logging_in: boolean;
  error: BasicError;

  client_id: number;
  redirect_url: string;
  state: string;

  user: User;
  client: OAuthClient;

  form: LoginForm = {
    name_or_email: undefined,
    password: undefined,
    remember: false
  };

  constructor(
    private accountService: AccountService,
    private oauthService: OauthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit() {
    let params = this.route.snapshot.queryParamMap;
    this.client_id = parseInt(params.get('client_id'));
    this.redirect_url = params.get('redirect_url');
    this.state = params.get('state');

    if (isNaN(this.client_id) || !this.redirect_url) {
      this.error = {msg: 'wrong url parameters'};
    }

    this.error = undefined;
    this.verifying_logged_in = true;
    this.accountService.get_current_user().pipe(
      finalize(() => this.verifying_logged_in = false)
    ).subscribe(
      user => {
        this.user = user;
        if (user != null)
          this.oauthConnect()
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
      (user) => {
        this.user = user;
        this.oauthConnect()
      },
      (error) => this.error = error.error
    );
  }

  oauthConnect() {
    this.starting_authorization = true;
    this.oauthService.connect(this.client_id, this.redirect_url, this.state).pipe(
      finalize(() => this.starting_authorization = false)
    ).subscribe(
      (result) => {
        this.start_authorization_success = true;
        window.location.href = result.redirect_url
      },
      (error) => this.error = error.error
    )
  }

}