import { Component, OnInit } from '@angular/core';
import {AccountService} from "../account.service";
import {finalize} from "rxjs/operators";
import {BasicError} from "../models";

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
    private accountService: AccountService
  ) { }

  ngOnInit() {
    this.logging_out = true;
    this.accountService.logout().pipe(
      finalize(()=>this.logging_out=false)
    ).subscribe(
      ()=>this.success = true,
      (error)=>this.error = error.error
    )
  }

}
