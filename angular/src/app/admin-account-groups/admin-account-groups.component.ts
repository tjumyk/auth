import {Component, OnInit} from '@angular/core';
import {BasicError, GroupAdvanced} from "../models";
import {AdminService} from "../admin.service";
import {finalize} from "rxjs/operators";
import {TitleService} from "../title.service";
import {NgForOf, NgIf} from "@angular/common";
import {RouterLink} from "@angular/router";

@Component({
  selector: 'app-admin-account-groups',
  templateUrl: './admin-account-groups.component.html',
  imports: [
    NgIf,
    RouterLink,
    NgForOf
  ],
  styleUrls: ['./admin-account-groups.component.less']
})
export class AdminAccountGroupsComponent implements OnInit {

  error: BasicError | undefined;
  loading_group_list: boolean | undefined;

  group_list: GroupAdvanced[] = [];

  constructor(
    private adminService: AdminService,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('Groups', 'Management');

    this.loading_group_list = true;
    this.adminService.get_group_list().pipe(
      finalize(() => this.loading_group_list = false)
    ).subscribe({
      next: (group_list) => this.group_list = group_list,
      error: (error) => this.error = error.error
    })
  }

  deleteGroup(group: GroupAdvanced, index: number, btn: HTMLElement) {
    if (!confirm(`Really want to delete group ${group.name}?`))
      return;

    btn.classList.add('loading', 'disabled');
    this.adminService.delete_group(group.id).pipe(
      finalize(() => btn.classList.remove('loading', 'disabled'))
    ).subscribe({
      next: () => this.group_list.splice(index, 1),
      error: (error) => this.error = error.error
    })
  }

}
