import { Component, OnInit } from '@angular/core';
import {BasicError, User} from "../models";
import {AccountService} from "../account.service";
import {ActivatedRoute} from "@angular/router";
import {finalize} from "rxjs/operators";
import {NgForm} from "@angular/forms";

class ResetPasswordForm {
  new_password: string;
  repeat_new_password: string;
}

@Component({
  selector: 'app-account-reset-password',
  templateUrl: './account-reset-password.component.html',
  styleUrls: ['./account-reset-password.component.less']
})
export class AccountResetPasswordComponent implements OnInit {
  error: BasicError;
  verifying:boolean;
  resetting: boolean;
  success: boolean;

  uid:number;
  user: User;
  token:string;
  form: ResetPasswordForm = new ResetPasswordForm();

  constructor(
    private accountService:AccountService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    let params = this.route.snapshot.queryParams;
    this.uid = parseInt(params.uid);
    this.token = params.token;

    this.verifying=true;
    this.accountService.reset_password(this.uid, this.token, null, true).pipe(
      finalize(()=>this.verifying=false)
    ).subscribe(
      (user)=>this.user = user,
      (error)=>this.error = error.error
    )
  }

  start_reset(f:NgForm){
    if(f.invalid)
      return;

    this.resetting = true;
    this.accountService.reset_password(this.uid, this.token, this.form.new_password).pipe(
      finalize(()=>this.resetting = false)
    ).subscribe(
      ()=>this.success = true,
      (error)=>this.error = error.error
    )
  }

}
