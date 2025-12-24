import {Component, OnInit} from '@angular/core';
import {BasicError} from "../models";
import {AccountService} from "../account.service";
import {FormsModule, NgForm} from "@angular/forms";
import {finalize} from "rxjs/operators";
import {TitleService} from "../title.service";
import {NgClass, NgIf} from "@angular/common";

@Component({
  selector: 'app-account-req-reconfirm-email',
  templateUrl: './account-req-reconfirm-email.component.html',
  imports: [
    NgIf,
    NgClass,
    FormsModule
  ],
  styleUrls: ['./account-req-reconfirm-email.component.less']
})
export class AccountReqReconfirmEmailComponent implements OnInit {

  error: BasicError | undefined;
  requesting: boolean | undefined;
  success: boolean | undefined;
  name_or_email: string | undefined;

  constructor(
    private accountService: AccountService,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('Request Email Re-confirmation');
  }

  start_request(f: NgForm) {
    if (!f.valid || this.name_or_email === undefined)
      return;

    this.requesting = true;
    this.accountService.request_reconfirm_email(this.name_or_email).pipe(
      finalize(() => this.requesting = false)
    ).subscribe({
      next: () => this.success = true,
      error: (error) => this.error = error.error
    })
  }

}
