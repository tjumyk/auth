import {Component, OnInit} from '@angular/core';
import {AdminService} from "../admin.service";
import {BasicError, UserAdvanced} from "../models";
import {debounceTime, finalize} from "rxjs/operators";
import {Pagination} from "../table-util";
import {Subject} from "rxjs";
import {TitleService} from "../title.service";

@Component({
  selector: 'app-admin-account-users',
  templateUrl: './admin-account-users.component.html',
  styleUrls: ['./admin-account-users.component.less']
})
export class AdminAccountUsersComponent implements OnInit {

  error: BasicError;
  loading_user_list: boolean;
  userPages: Pagination<UserAdvanced>;

  searchKey = new Subject<string>();

  constructor(
    private adminService: AdminService,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('Users', 'Management');

    this.searchKey.pipe(
      debounceTime(300)
    ).subscribe(
      key => {
        this.userPages.search(key)
      },
      error => this.error = error.error
    );

    this.loading_user_list = true;
    this.adminService.get_user_list().pipe(
      finalize(() => this.loading_user_list = false)
    ).subscribe(
      (user_list) => {
        this.userPages = new Pagination<UserAdvanced>(user_list);
        this.userPages.setSearchMatcher((user: UserAdvanced, key: string) => {
          const keyLower = key.toLowerCase();
          if (user.name.toLowerCase().indexOf(keyLower) >= 0)
            return true;
          if (user.id.toString().indexOf(keyLower) >= 0)
            return true;
          if (user.nickname && user.nickname.toLowerCase().indexOf(keyLower) >= 0)
            return true;
          if (user.email && user.email.toLowerCase().indexOf(keyLower) >= 0)
            return true;
          return false;
        });
      },
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
        for (let _user of this.userPages.sourceItems) {
          if (_user.id == user.id) {
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
