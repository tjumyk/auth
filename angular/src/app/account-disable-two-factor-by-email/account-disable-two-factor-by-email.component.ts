import {Component, OnInit} from '@angular/core';
import {BasicError} from "../models";
import {AccountService} from "../account.service";
import {TitleService} from "../title.service";
import {ActivatedRoute} from "@angular/router";
import {finalize} from "rxjs/operators";

@Component({
  selector: 'app-account-disable-two-factor-by-email',
  templateUrl: './account-disable-two-factor-by-email.component.html',
  styleUrls: ['./account-disable-two-factor-by-email.component.less']
})
export class AccountDisableTwoFactorByEmailComponent implements OnInit {
  error: BasicError;
  success: boolean;

  uid: number;
  token: string;
  disabling: boolean;

  constructor(private accountService: AccountService,
              private titleService: TitleService,
              private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.titleService.setTitle('Disable Two-Factor Authentication By Email');

    let params = this.route.snapshot.queryParams;
    this.uid = parseInt(params.uid);
    this.token = params.token;

    this.disabling = true;
    this.accountService.disable_two_factor_by_email(this.uid, this.token).pipe(
      finalize(() => this.disabling = false)
    ).subscribe(
      () => this.success = true,
      (error) => this.error = error.error
    )
  }

}
