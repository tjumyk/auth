import {Component, OnInit} from '@angular/core';
import {AdminService} from "../admin.service";
import {BasicError, UserAdvanced} from "../models";
import {finalize} from "rxjs/operators";
import {Pagination} from "../table-util";

@Component({
  selector: 'app-admin-account-users',
  templateUrl: './admin-account-users.component.html',
  styleUrls: ['./admin-account-users.component.less']
})
export class AdminAccountUsersComponent implements OnInit {

  error: BasicError;
  loading_user_list: boolean;
  userPages = new Pagination<UserAdvanced>();

  constructor(
    private adminService: AdminService
  ) {
  }

  ngOnInit() {
    this.loading_user_list = true;
    this.adminService.get_user_list().pipe(
      finalize(() => this.loading_user_list = false)
    ).subscribe(
      (user_list) => this.userPages.sourceItems = user_list,
      (error) => this.error = error.error
    );
  }

  deleteUser(user: UserAdvanced, btn: HTMLElement) {
    if (!confirm(`Really want to delete user ${user.name}?`))
      return;

    btn.classList.add('loading', 'disabled');
    this.adminService.delete_user(user.id).pipe(
      finalize(() => btn.classList.remove('loading', 'disabled'))
    ).subscribe(
      () => {
        let index = 0;
        for(let _user of this.userPages.sourceItems){
          if(_user.id == user.id){
            this.userPages.sourceItems.splice(index, 1);
            this.userPages.reload();
            break;
          }
          ++index;
        }
      },
      (error) => this.error = error.error
    )
  }

  sortField(field: string, th: HTMLElement) {
    let sibling = th.parentNode.firstChild;
    while (sibling) {
      if (sibling.nodeType == 1 && sibling != th) {
        (sibling as Element).classList.remove('sorted', 'descending', 'ascending');
      }
      sibling = sibling.nextSibling;
    }

    if (!th.classList.contains('sorted')) {
      th.classList.add('sorted', 'ascending');
      th.classList.remove('descending');
      this.userPages.sort(field, false);
    } else {
      if (th.classList.contains('ascending')) {
        th.classList.remove('ascending');
        th.classList.add('descending');
        this.userPages.sort(field, true);
      } else {
        th.classList.remove('sorted', 'descending', 'ascending');
        this.userPages.sort(null);
      }
    }
  }
}
