import {Component, OnInit} from '@angular/core';
import {AccountService} from "../account.service";
import {BasicError, User} from "../models";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {finalize} from "rxjs/operators";
import {FormsModule, NgForm} from "@angular/forms";
import {TitleService} from "../title.service";
import {NgClass, NgIf} from "@angular/common";

class RegisterForm {
  name: string | undefined;
  email: string | undefined;
}

@Component({
  selector: 'app-account-register',
  templateUrl: './account-register.component.html',
  imports: [
    NgIf,
    NgClass,
    FormsModule,
    RouterLink
  ],
  styleUrls: ['./account-register.component.less']
})
export class AccountRegisterComponent implements OnInit {
  verifying_logged_in: boolean | undefined;
  registering: boolean | undefined;
  error: BasicError | undefined;
  register_success: boolean | undefined;

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
    ).subscribe({
      next: user => {
        if (user != null) {
          this.afterLogin(user)
        }
      },
      error: error => this.error = error.error
    })
  }

  register(f: NgForm): void {
    if (f.invalid || this.form.name === undefined || this.form.email === undefined)
      return;

    this.error = undefined;
    this.registering = true;
    this.accountService.register(this.form.name, this.form.email).pipe(
      finalize(() => this.registering = false)
    ).subscribe({
      next: (user: User) => {
        this.register_success = true;
      },
      error: (error) => this.error = error.error
    });
  }

  afterLogin(user: User) {
    let redirect = this.route.snapshot.queryParamMap.get('redirect') || "/";
    this.router.navigate([redirect], {replaceUrl: true})
  }
}
