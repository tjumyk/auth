import {Component, OnInit} from '@angular/core';
import {BasicError, ExternalAuthProvider} from "../models";
import {AccountService} from "../account.service";
import {NgForm} from "@angular/forms";
import {finalize} from "rxjs/operators";
import {TitleService} from "../title.service";
import {Router} from "@angular/router";

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

  provider: ExternalAuthProvider;

  constructor(
    private accountService: AccountService,
    private titleService: TitleService,
    private router: Router
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('Request Password Reset');
  }

  start_request(f: NgForm) {
    if (!f.valid)
      return;

    this.requesting = true;
    this.accountService.request_reset_password(this.name_or_email).pipe(
      finalize(() => this.requesting = false)
    ).subscribe(
      resp => {
        if(resp === null){
          this.success = true;
        }else{
          this.provider = resp as ExternalAuthProvider;
        }
      },
      (error) => this.error = error.error
    )
  }
}
