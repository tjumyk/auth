import {Component, OnInit} from '@angular/core';
import {AccountService} from "../account.service";
import {BasicError, User} from "../models";
import {ActivatedRoute, Router} from "@angular/router";
import {finalize} from "rxjs/operators";
import {NgForm} from "@angular/forms";
import {TitleService} from "../title.service";

class RegisterForm {
  name: string;
  email: string;
}

@Component({
  selector: 'app-account-register',
  templateUrl: './account-register.component.html',
  styleUrls: ['./account-register.component.less']
})
export class AccountRegisterComponent implements OnInit {
  verifying_logged_in: boolean;
  registering: boolean;
  error: BasicError;
  register_success: boolean;

  form: RegisterForm = {
    name: undefined,
    email: undefined
  };

  constructor(
    private accountService: AccountService,
    private router: Router,
    private route: ActivatedRoute,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('Register');

    this.error = undefined;
    this.verifying_logged_in = true;
    this.accountService.get_current_user().pipe(
      finalize(() => this.verifying_logged_in = false)
    ).subscribe(
      user => {
        if (user != null) {
          this.afterLogin(user)
        }
      },
      error => this.error = error.error
    )
  }

  register(f: NgForm): void {
    if (f.invalid)
      return;

    this.error = undefined;
    this.registering = true;
    this.accountService.register(this.form.name, this.form.email).pipe(
      finalize(() => this.registering = false)
    ).subscribe(
      (user: User) => {
        this.register_success = true;
      },
      (error) => this.error = error.error
    );
  }

  afterLogin(user: User){
    let redirect = this.route.snapshot.queryParamMap.get('redirect') || "/";
    this.router.navigate([redirect], {replaceUrl: true})
  }
}
