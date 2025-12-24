import {Component, OnInit} from '@angular/core';
import {BasicError, GroupAdvanced, UserAdvanced} from "../models";
import {AdminService} from "../admin.service";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {debounceTime, distinctUntilChanged, finalize, switchMap} from "rxjs/operators";
import {FormsModule, NgForm} from "@angular/forms";
import {of, Subject} from "rxjs";
import {TitleService} from "../title.service";
import {DatePipe, NgClass, NgForOf, NgIf} from "@angular/common";

class ProfileForm {
  description: string | undefined;
}

@Component({
  selector: 'app-admin-account-group-edit',
  templateUrl: './admin-account-group-edit.component.html',
  imports: [
    NgIf,
    DatePipe,
    FormsModule,
    NgClass,
    RouterLink,
    NgForOf
  ],
  styleUrls: ['./admin-account-group-edit.component.less']
})
export class AdminAccountGroupEditComponent implements OnInit {
  error: BasicError | undefined;
  loading_group: boolean | undefined;
  loading_group_members: boolean | undefined;
  updating_profile: boolean | undefined;
  deleting: boolean | undefined;

  update_profile_success: boolean | undefined;
  update_profile_error: BasicError | undefined;

  add_member_error: BasicError | undefined;
  added_member: UserAdvanced | undefined;
  remove_member_error: BasicError | undefined;
  removed_member: UserAdvanced | undefined;

  group: GroupAdvanced | undefined;
  members: UserAdvanced[] | undefined;
  gid: number | undefined;

  user_search_results: UserAdvanced[] | null | undefined;
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
    const _gid = this.route.snapshot.paramMap.get('gid');
    this.gid = _gid ? parseInt(_gid) : undefined;

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
    ).subscribe({
      next: (results) => this.user_search_results = results,
      error: (error) => this.add_member_error = error.error
    });
  }

  private loadGroup() {
    this.error = undefined;
    if (this.gid === undefined) {
      return;
    }

    this.loading_group = true;
    this.adminService.get_group(this.gid, true).pipe(
      finalize(() => this.loading_group = false)
    ).subscribe({
      next: (group) => this.setGroup(group),
      error: (error) => this.error = error.error
    });
  }

  private loadGroupMembers() {
    this.error = undefined;
    if (this.gid === undefined) {
      return
    }

    this.loading_group_members = true;
    this.adminService.group_get_users(this.gid).pipe(
      finalize(() => this.loading_group_members = false)
    ).subscribe({
      next: (users) => this.members = users,
      error: (error) => this.error = error.error
    })
  }

  private setGroup(group: GroupAdvanced) {
    this.titleService.setTitle(group.name, 'Groups', 'Management');
    this.group = group;
    this.form.description = this.group.description;
  }

  deleteGroup() {
    if (this.group === undefined || this.gid === undefined) {
      return;
    }
    if (!confirm(`Really want to delete group ${this.group.name}?`))
      return;

    this.deleting = true;
    this.adminService.delete_group(this.gid).pipe(
      finalize(() => this.deleting = false)
    ).subscribe({
      next: () => this.router.navigate(['../..'], {relativeTo: this.route}),
      error: (error) => this.error = error.error
    })
  }

  updateProfile(f: NgForm) {
    if (f.invalid || this.gid === undefined || this.form.description === undefined)
      return;

    this.update_profile_error = undefined;
    this.update_profile_success = undefined;

    this.updating_profile = true;
    this.adminService.update_group(this.gid, this.form.description).pipe(
      finalize(() => this.updating_profile = false)
    ).subscribe({
      next: (group) => {
        this.setGroup(group);
        this.update_profile_success = true;
      },
      error: (error) => this.update_profile_error = error.error
    })
  }

  searchUser(name: string) {
    this.user_search_names.next(name);
  }

  addUserToGroup(user: UserAdvanced, index: number, btn: HTMLElement) {
    this.add_member_error = undefined;
    this.added_member = undefined;

    if (this.gid === undefined) {
      return;
    }

    btn.classList.add('disabled', 'loading');
    this.adminService.group_add_user(this.gid, user.id).pipe(
      finalize(() => btn.classList.remove('disabled', 'loading'))
    ).subscribe({
      next: () => {
        this.added_member = user;
        if (this.members) {
          this.members.push(user);
        }
      },
      error: (error) => this.add_member_error = error.error
    })
  }

  removeUserFromGroup(user: UserAdvanced, index: number, btn: HTMLElement) {
    this.remove_member_error = undefined;
    this.removed_member = undefined;

    if (this.gid === undefined) {
      return;
    }

    btn.classList.add('disabled', 'loading');
    this.adminService.group_remove_user(this.gid, user.id).pipe(
      finalize(() => btn.classList.remove('disabled', 'loading'))
    ).subscribe({
      next: () => {
        if (this.members) {
          this.members.splice(index, 1);
        }
        this.removed_member = user;
      },
      error: (error) => this.remove_member_error = error.error
    })
  }

  alreadyInGroup(user: UserAdvanced): boolean {
    if (this.members) {
      for (let u of this.members) {
        if (user.id == u.id)
          return true;
      }
    }
    return false;
  }
}
