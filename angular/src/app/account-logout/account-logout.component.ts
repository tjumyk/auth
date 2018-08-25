import { Component, OnInit } from '@angular/core';
import {AccountService} from "../account.service";
import {finalize} from "rxjs/operators";
import {BasicError} from "../models";
import {TitleService} from "../title.service";

@Component({
  selector: 'app-account-logout',
  templateUrl: './account-logout.component.html',
  styleUrls: ['./account-logout.component.less']
})
export class AccountLogoutComponent implements OnInit {
  logging_out:boolean;
  error: BasicError;
  success: boolean;

  constructor(
    private accountService: AccountService,
    private titleService: TitleService
  ) { }

  ngOnInit() {
    this.titleService.setTitle('Sign Out');

    this.logging_out = true;
    this.accountService.logout().pipe(
      finalize(()=>this.logging_out=false)
    ).subscribe(
      ()=>this.success = true,
      (error)=>this.error = error.error
    )
  }

}
