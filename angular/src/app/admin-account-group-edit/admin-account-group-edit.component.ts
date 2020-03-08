import {Component, OnInit} from '@angular/core';
import {BasicError, GroupAdvanced, UserAdvanced} from "../models";
import {AdminService} from "../admin.service";
import {ActivatedRoute, Router} from "@angular/router";
import {debounceTime, distinctUntilChanged, finalize, switchMap} from "rxjs/operators";
import {NgForm} from "@angular/forms";
import {of, Subject} from "rxjs";
import {TitleService} from "../title.service";

class ProfileForm {
  description: string;
}

@Component({
  selector: 'app-admin-account-group-edit',
  templateUrl: './admin-account-group-edit.component.html',
  styleUrls: ['./admin-account-group-edit.component.less']
})
export class AdminAccountGroupEditComponent implements OnInit {
  error: BasicError;
  loading_group: boolean;
  loading_group_members: boolean;
  updating_profile: boolean;
  deleting: boolean;

  update_profile_success: boolean;
  update_profile_error: BasicError;

  add_member_error: BasicError;
  added_member: UserAdvanced;
  remove_member_error: BasicError;
  removed_member: UserAdvanced;

  group: GroupAdvanced;
  members: UserAdvanced[];
  gid: number;

  user_search_results: UserAdvanced[];
  private user_search_names = new Subject<string>();

  form: ProfileForm = {
    description: undefined
  };

  constructor(
    private adminService: AdminService,
    private route: ActivatedRoute,
    private router: Router,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.gid = parseInt(this.route.snapshot.paramMap.get('gid'));

    this.setupUserSearch();
    this.loadGroup();
    this.loadGroupMembers();
  }

  private setupUserSearch() {
    this.user_search_names.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((name: string) => {
        if (!name)
          return of(null);
        return this.adminService.search_user_by_name(name, 10)
      })
    ).subscribe(
      (results) => this.user_search_results = results,
      (error) => this.add_member_error = error.error
    );
  }

  private loadGroup() {
    this.error = undefined;

    this.loading_group = true;
    this.adminService.get_group(this.gid, true).pipe(
      finalize(() => this.loading_group = false)
    ).subscribe(
      (group) => this.setGroup(group),
      (error) => this.error = error.error
    );
  }

  private loadGroupMembers() {
    this.error = undefined;

    this.loading_group_members = true;
    this.adminService.group_get_users(this.gid).pipe(
      finalize(() => this.loading_group_members = false)
    ).subscribe(
      (users) => this.members = users,
      (error) => this.error = error.error
    )
  }

  private setGroup(group: GroupAdvanced) {
    this.titleService.setTitle(group.name, 'Groups', 'Management');
    this.group = group;
    this.form.description = this.group.description;
  }

  deleteGroup() {
    if (!confirm(`Really want to delete group ${this.group.name}?`))
      return;

    this.deleting = true;
    this.adminService.delete_group(this.gid).pipe(
      finalize(() => this.deleting = false)
    ).subscribe(
      () => this.router.navigate(['../..'], {relativeTo: this.route}),
      (error) => this.error = error.error
    )
  }

  updateProfile(f: NgForm) {
    if (f.invalid)
      return;

    this.update_profile_error = undefined;
    this.update_profile_success = undefined;

    this.updating_profile = true;
    this.adminService.update_group(this.gid, this.form.description).pipe(
      finalize(() => this.updating_profile = false)
    ).subscribe(
      (group) => {
        this.setGroup(group);
        this.update_profile_success = true;
      },
      (error) => this.update_profile_error = error.error
    )
  }

  searchUser(name: string) {
    this.user_search_names.next(name);
  }

  addUserToGroup(user: UserAdvanced, index: number, btn: HTMLElement) {
    this.add_member_error = undefined;
    this.added_member = undefined;

    btn.classList.add('disabled', 'loading');
    this.adminService.group_add_user(this.gid, user.id).pipe(
      finalize(() => btn.classList.remove('disabled', 'loading'))
    ).subscribe(
      () => {
        this.added_member = user;
        this.members.push(user);
      },
      (error) => this.add_member_error = error.error
    )
  }

  removeUserFromGroup(user: UserAdvanced, index: number, btn: HTMLElement) {
    this.remove_member_error = undefined;
    this.removed_member = undefined;

    btn.classList.add('disabled', 'loading');
    this.adminService.group_remove_user(this.gid, user.id).pipe(
      finalize(() => btn.classList.remove('disabled', 'loading'))
    ).subscribe(
      () => {
        this.members.splice(index, 1);
        this.removed_member = user;
      },
      (error) => this.remove_member_error = error.error
    )
  }

  alreadyInGroup(user: UserAdvanced): boolean {
    for (let u of this.members) {
      if (user.id == u.id)
        return true;
    }
    return false;
  }
}
