import {Component, OnInit} from '@angular/core';
import {BasicError, GroupAdvanced} from "../models";
import {AdminService} from "../admin.service";
import {finalize} from "rxjs/operators";

@Component({
  selector: 'app-admin-account-groups',
  templateUrl: './admin-account-groups.component.html',
  styleUrls: ['./admin-account-groups.component.less']
})
export class AdminAccountGroupsComponent implements OnInit {

  error: BasicError;
  loading_group_list: boolean;

  group_list: GroupAdvanced[] = [];

  constructor(
    private adminService: AdminService
  ) {
  }

  ngOnInit() {
    this.loading_group_list = true;
    this.adminService.get_group_list().pipe(
      finalize(() => this.loading_group_list = false)
    ).subscribe(
      (group_list) => this.group_list = group_list,
      (error) => this.error = error.error
    )
  }

  deleteGroup(group: GroupAdvanced, btn: HTMLElement) {
    if (!confirm(`Really want to delete group ${group.name}?`))
      return;

    btn.classList.add('loading', 'disabled');
    this.adminService.delete_group(group.id).pipe(
      finalize(() => btn.classList.remove('loading', 'disabled'))
    ).subscribe(
      () => {
        let idx = 0;
        for (let _group of this.group_list) {
          if (_group.id == group.id) {
            this.group_list.splice(idx, 1);
            break;
          }
          idx++;
        }
      },
      (error) => this.error = error.error
    )
  }

}
