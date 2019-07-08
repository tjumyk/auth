import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {BasicError, User} from "../models";
import {NgForm} from "@angular/forms";
import {finalize} from "rxjs/operators";
import {AccountService} from "../account.service";

@Component({
  selector: 'app-two-factor-login-box',
  templateUrl: './two-factor-login-box.component.html',
  styleUrls: ['./two-factor-login-box.component.less']
})
export class TwoFactorLoginBoxComponent implements OnInit {
  @Input()
  remember: boolean;

  @Output()
  error: EventEmitter<BasicError> = new EventEmitter();

  @Output()
  verified: EventEmitter<User> = new EventEmitter();

  @Output()
  back: EventEmitter<any> = new EventEmitter();

  token: string;
  verifying_token: boolean;

  constructor(private accountService: AccountService) { }

  ngOnInit() {
  }

  verifyToken(f: NgForm){
    if (f.invalid)
      return;

    this.verifying_token = true;
    this.accountService.two_factor_login(this.token, this.remember).pipe(
      finalize(()=>this.verifying_token = false)
    ).subscribe(
      (user)=>{
        this.verified.emit(user);
      },
      error=>this.error.emit(error.error)
    )
  }
}
