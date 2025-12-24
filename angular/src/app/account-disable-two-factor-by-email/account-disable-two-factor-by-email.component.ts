import {Component, OnInit} from '@angular/core';
import {BasicError} from "../models";
import {AccountService} from "../account.service";
import {TitleService} from "../title.service";
import {ActivatedRoute} from "@angular/router";
import {finalize} from "rxjs/operators";
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-account-disable-two-factor-by-email',
  templateUrl: './account-disable-two-factor-by-email.component.html',
  imports: [
    NgIf
  ],
  styleUrls: ['./account-disable-two-factor-by-email.component.less']
})
export class AccountDisableTwoFactorByEmailComponent implements OnInit {
  error: BasicError | undefined;
  success: boolean | undefined;

  uid: number | undefined;
  token: string | undefined;
  disabling: boolean | undefined;

  constructor(private accountService: AccountService,
              private titleService: TitleService,
              private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.titleService.setTitle('Disable Two-Factor Authentication By Email');

    let params = this.route.snapshot.queryParams;
    this.uid = params['uid'] ? parseInt(params['uid']) : undefined;
    this.token = params['token'];

    if (this.uid === undefined || isNaN(this.uid) || this.token === undefined) {
      return
    }

    this.disabling = true;
    this.accountService.disable_two_factor_by_email(this.uid, this.token).pipe(
      finalize(() => this.disabling = false)
    ).subscribe({
      next: () => this.success = true,
      error: (error) => this.error = error.error
    })
  }

}
