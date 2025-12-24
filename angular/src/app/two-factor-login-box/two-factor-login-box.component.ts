import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {BasicError, User} from "../models";
import {FormsModule, NgForm} from "@angular/forms";
import {finalize} from "rxjs/operators";
import {AccountService} from "../account.service";
import {NgClass, NgIf} from "@angular/common";
import {RouterLink} from "@angular/router";

@Component({
  selector: 'app-two-factor-login-box',
  templateUrl: './two-factor-login-box.component.html',
  imports: [
    NgClass,
    FormsModule,
    NgIf,
    RouterLink
  ],
  styleUrls: ['./two-factor-login-box.component.less']
})
export class TwoFactorLoginBoxComponent implements OnInit {
  @Input()
  remember: boolean | undefined;

  @Output()
  error: EventEmitter<BasicError> = new EventEmitter();

  @Output()
  verified: EventEmitter<User> = new EventEmitter();

  @Output()
  back: EventEmitter<any> = new EventEmitter();

  token: string | undefined;
  verifying_token: boolean | undefined;

  constructor(private accountService: AccountService) { }

  ngOnInit() {
  }

  verifyToken(f: NgForm){
    if (f.invalid)
      return;

    if(this.token === undefined){
      return;
    }

    this.verifying_token = true;
    this.accountService.two_factor_login(this.token, this.remember).pipe(
      finalize(()=>this.verifying_token = false)
    ).subscribe({
      next:  (user)=>{
        this.verified.emit(user);
      },
      error: error=>this.error.emit(error.error)
    })
  }
}
