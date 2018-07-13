import {Component, OnInit} from '@angular/core';
import {AdminService} from "../admin.service";
import {BasicError, UserAdvanced} from "../models";
import {finalize} from "rxjs/operators";

@Component({
  selector: 'app-admin-account-users',
  templateUrl: './admin-account-users.component.html',
  styleUrls: ['./admin-account-users.component.less']
})
export class AdminAccountUsersComponent implements OnInit {

  error: BasicError;
  loading_user_list: boolean;

  user_list: UserAdvanced[] = [];

  constructor(
    private adminService: AdminService
  ) {
  }

  ngOnInit() {
    this.loading_user_list = true;
    this.adminService.get_user_list().pipe(
      finalize(() => this.loading_user_list = false)
    ).subscribe(
      (user_list) => this.user_list = user_list,
      (error) => this.error = error.error
    )
  }

  deleteUser(user: UserAdvanced, index: number, btn: HTMLElement) {
    if (!confirm(`Really want to delete user ${user.name}?`))
      return;

    btn.classList.add('loading', 'disabled');
    this.adminService.delete_user(user.id).pipe(
      finalize(() => btn.classList.remove('loading', 'disabled'))
    ).subscribe(
      () => this.user_list.splice(index, 1),
      (error) => this.error = error.error
    )
  }
}
