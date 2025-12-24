import {Component, OnInit} from '@angular/core';
import {BasicError} from "../models";
import {AccountService} from "../account.service";
import {finalize} from "rxjs/operators";
import {TitleService} from "../title.service";
import {NgClass, NgIf} from "@angular/common";

@Component({
  selector: 'app-account-request-disable-two-factor-by-email',
  templateUrl: './account-request-disable-two-factor-by-email.component.html',
  imports: [
    NgClass,
    NgIf
  ],
  styleUrls: ['./account-request-disable-two-factor-by-email.component.less']
})
export class AccountRequestDisableTwoFactorByEmailComponent implements OnInit {
  error: BasicError | undefined;

  requesting: boolean | undefined;
  success: boolean | undefined;

  constructor(private accountService: AccountService,
              private titleService: TitleService) {
  }

  ngOnInit() {
    this.titleService.setTitle('Request Disabling Two-Factor Authentication By Email');
  }

  start_request() {
    this.requesting = true;
    this.accountService.request_disable_two_factor_by_email().pipe(
      finalize(() => this.requesting = false)
    ).subscribe({
      next: () => this.success = true,
      error: error => this.error = error.error
    })
  }

}
