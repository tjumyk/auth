import {Component, OnInit} from '@angular/core';
import {Location} from "@angular/common";
import {BasicError, LoginRecord, UserAdvanced} from "../models";
import {NgForm} from "@angular/forms";
import {UploadFilters, UploadValidator} from "../upload-util";
import {finalize} from "rxjs/operators";
import {ActivatedRoute, Router} from "@angular/router";
import {AdminService} from "../admin.service";
import {TitleService} from "../title.service";


class StatusForm {
  is_active: boolean;
}

class ProfileForm {
  nickname: string;
}

@Component({
  selector: 'app-admin-account-user-edit',
  templateUrl: './admin-account-user-edit.component.html',
  styleUrls: ['./admin-account-user-edit.component.less']
})
export class AdminAccountUserEditComponent implements OnInit {
  loading_user: boolean;
  updating_profile: boolean;
  update_profile_success: boolean;
  updating_avatar: boolean;
  update_avatar_success: boolean;
  requesting_reconfirm_email: boolean;


  admin_operation_success: {
    msg: string,
    detail?: string
  };

  error: BasicError;
  update_profile_error: BasicError;
  update_avatar_error: BasicError;

  loading_login_records: boolean;
  login_records: LoginRecord[] = [];

  setting_active: boolean;
  deleting: boolean;
  impersonating: boolean;

  avatar_validator: UploadValidator;

  user: UserAdvanced;
  uid: number;
  status_form: StatusForm = new StatusForm();
  form: ProfileForm = new ProfileForm();

  constructor(
    private adminService: AdminService,
    private route: ActivatedRoute,
    private router: Router,
    private titleService: TitleService,
    private location: Location
  ) {
    this.avatar_validator = new UploadValidator(UploadFilters.avatar)
  }

  ngOnInit() {
    this.uid = parseInt(this.route.snapshot.paramMap.get('uid'));

    this.loadUser();
    this.loadUserLoginRecords();
  }

  private loadUser() {
    this.error = undefined;
    this.loading_user = true;
    this.adminService.get_user(this.uid).pipe(
      finalize(() => this.loading_user = false)
    ).subscribe(
      (user) => this.setUser(user),
      (error) => this.error = error.error
    );
  }

  private loadUserLoginRecords() {
    this.loading_login_records = true;
    this.adminService.get_user_login_records(this.uid).pipe(
      finalize(() => this.loading_login_records = false)
    ).subscribe(
      (records) => this.login_records = records,
      (error) => this.error = error.error
    )
  }

  private setUser(user: UserAdvanced) {
    this.titleService.setTitle(user.name, 'Users', 'Management');

    this.user = user;
    this.form.nickname = this.user.nickname;
    this.status_form.is_active = this.user.is_active
  }


  reconfirmEmail() {
    this.error = undefined;
    this.admin_operation_success = undefined;

    this.requesting_reconfirm_email = true;
    this.adminService.reconfirm_email(this.uid).pipe(
      finalize(() => this.requesting_reconfirm_email = false)
    ).subscribe(
      () => {
        this.loadUser();
        this.admin_operation_success = {msg: 'Reconfirm E-mail process started'}
      },
      (error) => this.error = error.error
    )
  }

  setActive(is_active) {
    this.error = undefined;
    this.admin_operation_success = undefined;

    this.setting_active = true;
    this.adminService.set_user_active(this.uid, is_active).pipe(
      finalize(() => this.setting_active = false)
    ).subscribe(
      () => {
        this.loadUser();
        this.admin_operation_success = {msg: 'User status updated successfully'}
      },
      (error) => this.error = error.error
    )
  }

  deleteUser() {
    if (!confirm(`Really want to delete user ${this.user.name}?`))
      return;

    this.deleting = true;
    this.adminService.delete_user(this.uid).pipe(
      finalize(() => this.deleting = false)
    ).subscribe(
      () => this.router.navigate(['../..'], {relativeTo: this.route}),
      (error) => this.error = error.error
    )
  }

  updateProfile(f: NgForm) {
    if (f.invalid)
      return;

    this.update_profile_success = undefined;
    this.update_profile_error = undefined;

    this.updating_profile = true;
    this.adminService.update_user_profile(this.uid, this.form.nickname).pipe(
      finalize(() => this.updating_profile = false)
    ).subscribe(
      (user) => {
        this.setUser(user);
        this.update_profile_success = true
      },
      (error) => this.update_profile_error = error.error
    )
  }

  uploadAvatar(input: HTMLInputElement) {
    let files = input.files;
    if (files.length == 0)
      return;

    this.update_avatar_success = undefined;
    this.update_avatar_error = undefined;

    let file = files.item(0);
    if (!this.avatar_validator.check(file)) {
      input.value = '';  // reset
      this.update_avatar_error = this.avatar_validator.error;
      return;
    }

    this.updating_avatar = true;
    this.adminService.update_user_avatar(this.uid, file).pipe(
      finalize(() => {
        this.updating_avatar = false;
        input.value = '';  // reset
      })
    ).subscribe(
      (user) => {
        this.setUser(user);
        this.update_avatar_success = true
      },
      (error) => this.update_avatar_error = error.error
    )
  }

  impersonateUser() {
    if(!confirm(`You will log out from the current account and log in as ${this.user.name}.\nContinue?`))
      return;

    this.impersonating = true;
    this.adminService.impersonate_user(this.uid).pipe(
      finalize(() => {
        this.impersonating = false;
      })
    ).subscribe(
      () => {
        this.location.go('/');
        window.location.reload();
      },
      error => this.error = error.error
    )
  }

}
