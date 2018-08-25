import {Component, OnInit} from '@angular/core';
import {BasicError, User} from "../models";
import {AccountService} from "../account.service";
import {finalize} from "rxjs/operators";
import {NgForm} from "@angular/forms";
import {UploadFilters, UploadValidator} from "../upload-util";
import {TitleService} from "../title.service";

class ProfileForm {
  nickname: string;
}

@Component({
  selector: 'app-settings-profile',
  templateUrl: './settings-profile.component.html',
  styleUrls: ['./settings-profile.component.less']
})
export class SettingsProfileComponent implements OnInit {
  loading_user: boolean;
  updating_profile: boolean;
  update_profile_success: boolean;
  updating_avatar: boolean;
  update_avatar_success: boolean;

  error: BasicError;
  update_profile_error: BasicError;
  update_avatar_error: BasicError;

  avatar_validator: UploadValidator;

  user: User;
  form: ProfileForm = new ProfileForm();

  constructor(
    private accountService: AccountService,
    private titleService: TitleService
  ) {
    this.avatar_validator = new UploadValidator(UploadFilters.avatar)
  }

  ngOnInit() {
    this.titleService.setTitle('Profile', 'Settings');

    this.loading_user = true;
    this.accountService.get_me().pipe(
      finalize(() => this.loading_user = false)
    ).subscribe((user) => {
      this.setUser(user)
    })
  }

  private setUser(user: User) {
    this.user = user;
    this.form.nickname = this.user.nickname;
  }

  updateProfile(f: NgForm) {
    if (f.invalid)
      return;

    this.update_profile_success = undefined;
    this.update_profile_error = undefined;

    this.updating_profile = true;
    this.accountService.update_my_profile(this.form.nickname).pipe(
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
    this.accountService.update_my_avatar(file).pipe(
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
}
