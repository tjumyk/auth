import {Component, OnInit} from '@angular/core';
import {BasicError} from "../models";
import {AccountService} from "../account.service";
import {NgForm} from "@angular/forms";
import {finalize} from "rxjs/operators";

@Component({
  selector: 'app-account-req-reset-password',
  templateUrl: './account-req-reset-password.component.html',
  styleUrls: ['./account-req-reset-password.component.less']
})
export class AccountReqResetPasswordComponent implements OnInit {
  error: BasicError;
  requesting: boolean;
  success: boolean;
  name_or_email: string;

  constructor(
    private accountService: AccountService
  ) {
  }

  ngOnInit() {
  }

  start_request(f: NgForm) {
    if (!f.valid)
      return;

    this.requesting = true;
    this.accountService.request_reset_password(this.name_or_email).pipe(
      finalize(() => this.requesting = false)
    ).subscribe(
      () => this.success = true,
      (error) => this.error = error.error
    )
  }
}
