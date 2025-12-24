import {Component, OnInit} from '@angular/core';
import {DatePipe, DecimalPipe, Location, LowerCasePipe, NgClass, NgForOf, NgIf} from "@angular/common";
import {BasicError, ExternalAuthProvider, ExternalUserInfoResult, LoginRecord, UserAdvanced} from "../models";
import {FormsModule, NgForm} from "@angular/forms";
import {UploadFilters, UploadValidator} from "../upload-util";
import {finalize} from "rxjs/operators";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {AdminService} from "../admin.service";
import {TitleService} from "../title.service";
import {AccountService} from "../account.service";
import {UAParser} from "ua-parser-js";
import IBrowser = UAParser.IBrowser;
import IOS = UAParser.IOS;


class StatusForm {
  is_active: boolean | undefined;
}

class ProfileForm {
  nickname: string | undefined;
}

@Component({
  selector: 'app-admin-account-user-edit',
  templateUrl: './admin-account-user-edit.component.html',
  imports: [
    NgIf,
    RouterLink,
    DatePipe,
    NgForOf,
    NgClass,
    FormsModule,
    DecimalPipe,
    LowerCasePipe
  ],
  styleUrls: ['./admin-account-user-edit.component.less']
})
export class AdminAccountUserEditComponent implements OnInit {
  loading_user: boolean | undefined;
  updating_profile: boolean | undefined;
  update_profile_success: boolean | undefined;
  updating_avatar: boolean | undefined;
  update_avatar_success: boolean | undefined;
  requesting_reconfirm_email: boolean | undefined;
  requesting_confirm_email_url: boolean | undefined;

  admin_operation_success: {
    msg: string,
    detail?: string
  } | undefined;

  error: BasicError | undefined;
  update_profile_error: BasicError | undefined;
  update_avatar_error: BasicError | undefined;

  loading_login_records: boolean | undefined;
  login_records: LoginRecord[] = [];

  setting_active: boolean | undefined;
  deleting: boolean | undefined;
  impersonating: boolean | undefined;

  external_info: ExternalUserInfoResult[] | undefined;
  getting_external_info: boolean | undefined;

  avatar_validator: UploadValidator;

  user: UserAdvanced | undefined;
  uid: number | undefined;
  status_form: StatusForm = new StatusForm();
  form: ProfileForm = new ProfileForm();
  provider: ExternalAuthProvider | undefined;

  private ua_parser = new UAParser();

  constructor(
    private accountService: AccountService,
    private adminService: AdminService,
    private route: ActivatedRoute,
    private router: Router,
    private titleService: TitleService,
    private location: Location
  ) {
    this.avatar_validator = new UploadValidator(UploadFilters.avatar)
  }

  ngOnInit() {
    const _uid = this.route.snapshot.paramMap.get('uid');
    this.uid = _uid ? parseInt(_uid) : undefined;

    this.loadUser();
    this.loadUserLoginRecords();
  }

  private loadUser() {
    this.error = undefined;
    if (this.uid === undefined) {
      return;
    }

    this.loading_user = true;
    this.adminService.get_user(this.uid, true).pipe(
      finalize(() => this.loading_user = false)
    ).subscribe({
      next: (user) => this.setUser(user),
      error: (error) => this.error = error.error
    });
  }

  private loadUserLoginRecords() {
    if (this.uid === undefined) {
      return;
    }
    this.loading_login_records = true;
    this.adminService.get_user_login_records(this.uid, true).pipe(
      finalize(() => this.loading_login_records = false)
    ).subscribe({
      next: (records) => {
        let ua_parsed: { [key: string]: UAParser.IResult } = {};
        for (let r of records) {
          if (r.user_agent === undefined) {
            continue;
          }
          let ua = ua_parsed[r.user_agent];
          if (!ua) {
            this.ua_parser.setUA(r.user_agent);
            ua = ua_parsed[r.user_agent] = this.ua_parser.getResult()
          }
          r['_ua_os_icon'] = this.getOSIcon(ua.os);
          r['_ua_browser_icon'] = this.getBrowserIcon(ua.browser);
        }
        this.login_records = records
      },
      error: (error) => this.error = error.error
    })
  }

  private getOSIcon(os: IOS) {
    switch (os.name) {
      case  'Windows':
      case 'Linux':
      case 'Android':
        return os.name.toLowerCase();
      case 'Mac OS':
      case 'iOS':
        return 'apple';
      default:
        return 'question circle outline';
    }
  }

  private getBrowserIcon(browser: IBrowser) {
    switch (browser.name) {
      case 'Chrome':
      case 'Firefox':
      case 'Opera':
      case 'Safari':
        return browser.name.toLowerCase();
      case  'IE':
        return 'internet explorer';
      default:
        return 'question circle outline';
    }
  }

  private setUser(user: UserAdvanced) {
    this.titleService.setTitle(user.name, 'Users', 'Management');

    this.user = user;
    this.form.nickname = this.user.nickname;
    this.status_form.is_active = this.user.is_active;

    this.getExternalInfo();

    if (user.external_auth_provider_id) {
      this.accountService.get_external_auth_provider(user.external_auth_provider_id).subscribe({
        next: provider => this.provider = provider,
        error: error => this.error = error.error
      });
    }
  }


  reconfirmEmail() {
    this.error = undefined;
    this.admin_operation_success = undefined;

    if (this.uid === undefined) {
      return
    }

    this.requesting_reconfirm_email = true;
    this.adminService.reconfirm_email(this.uid).pipe(
      finalize(() => this.requesting_reconfirm_email = false)
    ).subscribe({
      next: () => {
        this.loadUser();
        this.admin_operation_success = {msg: 'Reconfirm E-mail process started'}
      },
      error: (error) => this.error = error.error
    })
  }

  getConfirmEmailURL() {
    this.error = undefined;
    this.admin_operation_success = undefined;

    if (this.uid === undefined) {
      return
    }

    this.requesting_confirm_email_url = true;
    this.adminService.get_confirm_email_url(this.uid).pipe(
      finalize(() => this.requesting_confirm_email_url = false)
    ).subscribe({
      next: resp => {
        this.admin_operation_success = {msg: 'E-mail Confirmation Link', detail: resp.url}
      },
      error: error => this.error = error.error
    })
  }

  setActive(is_active: boolean) {
    this.error = undefined;
    this.admin_operation_success = undefined;

    if (this.uid === undefined) {
      return;
    }

    this.setting_active = true;
    this.adminService.set_user_active(this.uid, is_active).pipe(
      finalize(() => this.setting_active = false)
    ).subscribe({
      next: () => {
        this.loadUser();
        this.admin_operation_success = {msg: 'User status updated successfully'}
      },
      error: (error) => this.error = error.error
    })
  }

  deleteUser() {
    if (this.uid === undefined || this.user === undefined) {
      return;
    }

    if (!confirm(`Really want to delete user ${this.user.name}?`))
      return;

    this.deleting = true;
    this.adminService.delete_user(this.uid).pipe(
      finalize(() => this.deleting = false)
    ).subscribe({
      next: () => this.router.navigate(['../..'], {relativeTo: this.route}),
      error: (error) => this.error = error.error
    })
  }

  updateProfile(f: NgForm) {
    if (f.invalid || this.uid === undefined || this.form.nickname === undefined)
      return;

    this.update_profile_success = undefined;
    this.update_profile_error = undefined;

    this.updating_profile = true;
    this.adminService.update_user_profile(this.uid, this.form.nickname).pipe(
      finalize(() => this.updating_profile = false)
    ).subscribe({
      next: (user) => {
        this.setUser(user);
        this.update_profile_success = true
      },
      error: (error) => this.update_profile_error = error.error
    })
  }

  uploadAvatar(input: HTMLInputElement) {
    let files = input.files;
    if (files === null || files.length == 0 || this.uid === undefined)
      return;

    this.update_avatar_success = undefined;
    this.update_avatar_error = undefined;

    let file = files.item(0);
    if (file === null) {
      return;
    }
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
    ).subscribe({
      next: (user) => {
        this.setUser(user);
        this.update_avatar_success = true
      },
      error: (error) => this.update_avatar_error = error.error
    })
  }

  impersonateUser() {
    if (this.uid === undefined || this.user === undefined) {
      return;
    }

    if (!confirm(`You will log out from the current account and log in as ${this.user.name}.\nContinue?`))
      return;

    this.impersonating = true;
    this.adminService.impersonate_user(this.uid).pipe(
      finalize(() => {
        this.impersonating = false;
      })
    ).subscribe({
      next: () => {
        this.location.go('/');
        window.location.reload();
      },
      error: error => this.error = error.error
    })
  }

  lookupIPInfo(ip_addr: string, btn: HTMLElement) {
    btn.classList.add('disabled', 'loading');
    this.adminService.lookup_ip_info(ip_addr, true).pipe(
      finalize(() => {
        btn.classList.remove('disabled', 'loading');
      })
    ).subscribe({
      next: info => {
        alert(JSON.stringify(info, null, 4))
      },
      error: error => this.error = error.error
    })
  }

  getExternalInfo() {
    if (this.uid === undefined) {
      return;
    }

    this.getting_external_info = true;
    this.adminService.get_user_external_info(this.uid).pipe(
      finalize(() => this.getting_external_info = false)
    ).subscribe({
      next: info => this.external_info = info,
      error: error => this.error = error.error
    })
  }

}
