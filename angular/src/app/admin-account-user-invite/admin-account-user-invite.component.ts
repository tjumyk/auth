import {Component, OnInit} from '@angular/core';
import {BasicError, ExternalAuthProvider, UserAdvanced} from "../models";
import {AdminService, InviteForm} from "../admin.service";
import {finalize} from "rxjs/operators";
import {FormsModule, NgForm} from "@angular/forms";
import {TitleService} from "../title.service";
import {AccountService} from "../account.service";
import {DatePipe, NgClass, NgForOf, NgIf} from "@angular/common";
import {RouterLink} from "@angular/router";

@Component({
  selector: 'app-admin-account-user-invite',
  templateUrl: './admin-account-user-invite.component.html',
  imports: [
    NgIf,
    FormsModule,
    NgClass,
    RouterLink,
    NgForOf,
    DatePipe
  ],
  styleUrls: ['./admin-account-user-invite.component.less']
})
export class AdminAccountUserInviteComponent implements OnInit {
  error: BasicError | undefined;
  requesting: boolean | undefined;
  new_user: UserAdvanced | undefined;
  form: InviteForm = new InviteForm();

  new_users: UserAdvanced[] = [];

  providers: ExternalAuthProvider[] | undefined;

  constructor(
    private adminService: AdminService,
    private accountService: AccountService,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('Invite User', 'Management');
    this.accountService.get_external_auth_providers().subscribe({
      next: providers => {
        this.providers = providers;
      },
      error: error => this.error = error.error
    })
  }

  invite(f: NgForm) {
    if (f.invalid)
      return;

    this.error = undefined;
    this.new_user = undefined;
    this.requesting = true;
    this.adminService.invite_user(this.form).pipe(
      finalize(() => this.requesting = false)
    ).subscribe({
      next: (user) => {
        this.new_user = user;
        this.new_users.push(user)
      },
      error: (error) => this.error = error.error
    })
  }

  onChangeProvider() {
    if (!this.form.external_auth_provider_id) {
      this.form.skip_email_confirmation = undefined;
    }
  }
}
