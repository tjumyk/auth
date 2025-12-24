import { Component, OnInit } from '@angular/core';
import {AccountService} from "../account.service";
import {finalize} from "rxjs/operators";
import {BasicError} from "../models";
import {TitleService} from "../title.service";
import {RouterLink} from "@angular/router";
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-account-logout',
  templateUrl: './account-logout.component.html',
  imports: [
    RouterLink,
    NgIf
  ],
  styleUrls: ['./account-logout.component.less']
})
export class AccountLogoutComponent implements OnInit {
  logging_out:boolean | undefined;
  error: BasicError | undefined;
  success: boolean | undefined;

  constructor(
    private accountService: AccountService,
    private titleService: TitleService
  ) { }

  ngOnInit() {
    this.titleService.setTitle('Sign Out');

    this.logging_out = true;
    this.accountService.logout().pipe(
      finalize(()=>this.logging_out=false)
    ).subscribe({
      next:()=>this.success = true,
      error: (error)=>this.error = error.error
    })
  }

}
