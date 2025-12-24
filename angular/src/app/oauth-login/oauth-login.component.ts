import {Component, OnInit} from '@angular/core';
import {AccountService} from "../account.service";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {FormsModule, NgForm} from "@angular/forms";
import {BasicError, OAuthClient, User} from "../models";
import {finalize} from "rxjs/operators";
import {OauthService} from "../oauth.service";
import {TitleService} from "../title.service";
import {NgClass, NgIf} from "@angular/common";
import {TwoFactorLoginBoxComponent} from "../two-factor-login-box/two-factor-login-box.component";

class LoginForm {
  name_or_email: string | undefined;
  password: string | undefined;
  remember: boolean = false;
}

@Component({
  selector: 'app-oauth-login',
  templateUrl: './oauth-login.component.html',
  imports: [
    NgIf,
    TwoFactorLoginBoxComponent,
    NgClass,
    FormsModule,
    RouterLink
  ],
  styleUrls: ['./oauth-login.component.less']
})
export class OauthLoginComponent implements OnInit {
  verifying_logged_in: boolean | undefined;
  loading_client: boolean | undefined;
  starting_authorization: boolean | undefined;
  start_authorization_success: boolean | undefined;
  logging_in: boolean | undefined;
  error: BasicError | undefined;

  client_id: number | undefined;
  redirect_url: string | undefined | null;
  original_path: string | undefined | null;
  state: string | undefined | null;

  user: User | undefined;
  client: OAuthClient | undefined;

  show_two_factor: boolean | undefined;

  form: LoginForm = {
    name_or_email: undefined,
    password: undefined,
    remember: false
  };

  constructor(
    private accountService: AccountService,
    private oauthService: OauthService,
    private router: Router,
    private route: ActivatedRoute,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('OAuth Sign In');

    let params = this.route.snapshot.queryParamMap;
    const _client_id = params.get('client_id');
    this.client_id = _client_id ? parseInt(_client_id) : undefined;
    this.redirect_url = params.get('redirect_url');
    this.original_path = params.get('original_path');
    this.state = params.get('state');

    if (this.client_id === undefined || isNaN(this.client_id) || !this.redirect_url) {
      this.error = {msg: 'wrong url parameters'};
      return; // stop the following initialisations
    }

    this.loadCurrentUser();
  }

  private loadCurrentUser() {
    this.error = undefined;
    this.verifying_logged_in = true;
    this.accountService.get_current_user().pipe(
      finalize(() => this.verifying_logged_in = false)
    ).subscribe({
      next: user => {
        this.user = user;
        if (user == null)
          this.loadClient(); // only load client info if user need to wait at login page
        else
          this.oauthConnect() // when auto connect, skip loading client info
      },
      error: error => this.error = error.error
    })
  }

  private loadClient() {
    this.error = undefined;
    if (this.client_id === undefined) {
      return;
    }

    this.loading_client = true;
    this.oauthService.get_client(this.client_id).pipe(
      finalize(() => this.loading_client = false)
    ).subscribe({
      next: client => {
        this.client = client;
        this.titleService.setTitle(client.name, 'OAuth Sign In');
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
      next: (user) => {
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
    this.user = user;
    this.oauthConnect()
  }

  oauthConnect() {
    if (this.client_id === undefined || this.redirect_url === undefined || this.redirect_url === null) {
      return;
    }

    this.starting_authorization = true;
    this.oauthService.connect(this.client_id, this.redirect_url, this.original_path, this.state).pipe(
      finalize(() => this.starting_authorization = false)
    ).subscribe({
      next: (result) => {
        this.start_authorization_success = true;
        if(result.redirect_url){
          window.location.href = result.redirect_url
        }
      },
      error: (error) => this.error = error.error
    })
  }

}
