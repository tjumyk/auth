import { Component, OnInit } from '@angular/core';
import {BasicError, User} from "../models";
import {ActivatedRoute, Router} from "@angular/router";
import {AccountService} from "../account.service";
import {NgForm} from "@angular/forms";
import {finalize} from "rxjs/operators";

class SetPasswordForm {
  new_password: string;
  repeat_new_password: string;
}

@Component({
  selector: 'app-account-confirm-email',
  templateUrl: './account-confirm-email.component.html',
  styleUrls: ['./account-confirm-email.component.less']
})
export class AccountConfirmEmailComponent implements OnInit {
  error: BasicError;
  verifying:boolean;
  requesting: boolean;

  uid:number;
  user:User;
  token:string;
  form: SetPasswordForm = new SetPasswordForm();

  constructor(
    private accountService:AccountService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    let params = this.route.snapshot.queryParams;
    this.uid = parseInt(params.uid);
    this.token = params.token;

    this.verifying=true;
    this.accountService.confirm_email(this.uid, this.token, null, true).pipe(
      finalize(()=>this.verifying=false)
    ).subscribe(
      (user:User)=>{
        this.user = user
      },
      (error)=>this.error = error.error
    )
  }

  start_reset(f:NgForm){
    if(f.invalid)
      return;

    this.requesting = true;
    this.accountService.confirm_email(this.uid, this.token, this.form.new_password).pipe(
      finalize(()=>this.requesting = false)
    ).subscribe(
      ()=>this.router.navigate(['/'], {replaceUrl: true}),
      (error)=>this.error = error.error
    )
  }

}