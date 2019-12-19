import {Component, OnInit} from '@angular/core';
import {BasicError, ExternalAuthProvider, UserAdvanced} from "../models";
import {AdminService, InviteForm} from "../admin.service";
import {finalize} from "rxjs/operators";
import {NgForm} from "@angular/forms";
import {TitleService} from "../title.service";
import {AccountService} from "../account.service";

@Component({
  selector: 'app-admin-account-user-invite',
  templateUrl: './admin-account-user-invite.component.html',
  styleUrls: ['./admin-account-user-invite.component.less']
})
export class AdminAccountUserInviteComponent implements OnInit {
  error: BasicError;
  requesting: boolean;
  new_user: UserAdvanced;
  form: InviteForm = new InviteForm();

  new_users: UserAdvanced[] = [];

  providers: ExternalAuthProvider[];

  constructor(
    private adminService: AdminService,
    private accountService: AccountService,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('Invite User', 'Management');
    this.accountService.get_external_auth_providers().subscribe(
      providers => {
        this.providers = providers;
      },
      error => this.error = error.error
    )
  }

  invite(f: NgForm) {
    if (f.invalid)
      return;

    this.error = undefined;
    this.new_user = undefined;
    this.requesting = true;
    this.adminService.invite_user(this.form).pipe(
      finalize(() => this.requesting = false)
    ).subscribe(
      (user) => {
        this.new_user = user;
        this.new_users.push(user)
      },
      (error) => this.error = error.error
    )
  }

  onChangeProvider() {
    if(!this.form.external_auth_provider_id){
      this.form.skip_email_confirmation = undefined;
    }
  }
}
