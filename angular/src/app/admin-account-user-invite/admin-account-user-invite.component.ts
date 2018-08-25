import {Component, OnInit} from '@angular/core';
import {BasicError, UserAdvanced} from "../models";
import {AdminService} from "../admin.service";
import {finalize} from "rxjs/operators";
import {NgForm} from "@angular/forms";
import {TitleService} from "../title.service";

class InviteForm {
  name: string;
  email: string;
}

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

  constructor(
    private adminService: AdminService,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('Invite User', 'Management')
  }

  invite(f: NgForm) {
    if (f.invalid)
      return;

    this.error = undefined;
    this.new_user = undefined;
    this.requesting = true;
    this.adminService.invite_user(this.form.name, this.form.email).pipe(
      finalize(() => this.requesting = false)
    ).subscribe(
      (user) => {
        this.new_user = user;
        this.new_users.push(user)
      },
      (error) => this.error = error.error
    )
  }
}
