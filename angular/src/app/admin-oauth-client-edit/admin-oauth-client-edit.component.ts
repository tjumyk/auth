import {Component, OnInit} from '@angular/core';
import {BasicError, Group, GroupAdvanced, OAuthAuthorization, OAuthClientAdvanced} from "../models";
import {AdminService} from "../admin.service";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {FormsModule, NgForm} from "@angular/forms";
import {UploadFilters, UploadValidator} from "../upload-util";
import {debounceTime, distinctUntilChanged, finalize, switchMap} from "rxjs/operators";
import {of, Subject} from "rxjs";
import {Pagination} from "../table-util";
import {TitleService} from "../title.service";
import {DatePipe, DecimalPipe, NgClass, NgForOf, NgIf} from "@angular/common";

class ProfileForm {
  redirect_url: string | undefined;
  home_url: string | undefined;
  description: string | undefined;
}

@Component({
  selector: 'app-admin-oauth-client-edit',
  templateUrl: './admin-oauth-client-edit.component.html',
  imports: [
    NgIf,
    NgClass,
    FormsModule,
    DecimalPipe,
    RouterLink,
    DatePipe,
    NgForOf
  ],
  styleUrls: ['./admin-oauth-client-edit.component.less']
})
export class AdminOauthClientEditComponent implements OnInit {
  loading_client: boolean | undefined;
  updating_profile: boolean | undefined;
  update_profile_success: boolean | undefined;
  updating_icon: boolean | undefined;
  update_icon_success: boolean | undefined;

  admin_operation_success: {
    msg: string,
    detail?: string
  } | undefined;

  error: BasicError | undefined;
  update_profile_error: BasicError | undefined;
  update_icon_error: BasicError | undefined;

  add_allowed_group_error: BasicError | undefined;
  added_allowed_group: GroupAdvanced | undefined;
  remove_allowed_group_error: BasicError | undefined;
  removed_allowed_group: GroupAdvanced | undefined;

  group_search_results: GroupAdvanced[] | undefined | null;
  private group_search_names = new Subject<string>();

  loading_authorizations: boolean | undefined;
  authorizationPages: Pagination<OAuthAuthorization> | undefined;

  regenerating_secret: boolean | undefined;
  setting_public: boolean | undefined;
  deleting: boolean | undefined;

  icon_validator: UploadValidator;

  client: OAuthClientAdvanced | undefined;
  cid: number | undefined;
  form: ProfileForm = new ProfileForm();

  constructor(
    private adminService: AdminService,
    private route: ActivatedRoute,
    private router: Router,
    private titleService: TitleService
  ) {
    this.icon_validator = new UploadValidator(UploadFilters.icon)
  }

  ngOnInit() {
    const _cid = this.route.snapshot.paramMap.get('cid');
    this.cid = _cid ? parseInt(_cid) : undefined;

    this.setupUserSearch();
    this.loadClient();
    this.loadAuthorizations();
  }

  private loadClient() {
    this.error = undefined;
    if (this.cid === undefined) {
      return;
    }

    this.loading_client = true;
    this.adminService.get_oauth_client(this.cid).pipe(
      finalize(() => this.loading_client = false)
    ).subscribe({
      next: (client) => this.setClient(client),
      error: (error) => this.error = error.error
    });
  }

  private loadAuthorizations() {
    if (this.cid === undefined) {
      return;
    }
    this.loading_authorizations = true;
    this.adminService.client_get_authorizations(this.cid).pipe(
      finalize(() => this.loading_authorizations = false)
    ).subscribe({
      next: (records) => this.authorizationPages = new Pagination(records),
      error: (error) => this.error = error.error
    })
  }

  private setClient(client: OAuthClientAdvanced) {
    this.titleService.setTitle(client.name, 'OAuth Clients', 'Management');

    this.client = client;

    this.form.redirect_url = client.redirect_url;
    this.form.home_url = client.home_url;
    this.form.description = client.description;
  }


  regenerateSecret() {
    if (this.cid === undefined || this.client === undefined) {
      return;
    }

    if (!confirm(`Regenerating secret will break current authentication for ${this.client.name}. ` +
      `You must update the secret on the client side ASAP after this operation. Still proceed?`))
      return;

    this.error = undefined;
    this.admin_operation_success = undefined;

    this.regenerating_secret = true;
    this.adminService.client_regenerate_secret(this.cid).pipe(
      finalize(() => this.regenerating_secret = false)
    ).subscribe({
      next: () => {
        this.loadClient();
        this.admin_operation_success = {msg: 'Secret regenerated'}
      },
      error: (error) => this.error = error.error
    })
  }

  deleteClient() {
    if (this.cid === undefined || this.client === undefined) {
      return;
    }
    if (!confirm(`Really want to delete client ${this.client.name}?`))
      return;

    this.deleting = true;
    this.adminService.delete_oauth_client(this.cid).pipe(
      finalize(() => this.deleting = false)
    ).subscribe({
      next: () => this.router.navigate(['../..'], {relativeTo: this.route}),
      error: (error) => this.error = error.error
    })
  }

  updateProfile(f: NgForm) {
    if (f.invalid || this.cid === undefined || this.form.redirect_url === undefined || this.form.home_url === undefined
      || this.form.description === undefined)
      return;

    this.update_profile_success = undefined;
    this.update_profile_error = undefined;

    this.updating_profile = true;
    this.adminService.update_oauth_client_profile(this.cid, this.form.redirect_url, this.form.home_url,
      this.form.description).pipe(
      finalize(() => this.updating_profile = false)
    ).subscribe({
      next: (user) => {
        this.setClient(user);
        this.update_profile_success = true
      },
      error: (error) => this.update_profile_error = error.error
    })
  }

  uploadIcon(input: HTMLInputElement) {
    let files = input.files;
    if (files === null || files.length == 0)
      return;

    this.update_icon_success = undefined;
    this.update_icon_error = undefined;

    let file = files.item(0);
    if (file === null) {
      return;
    }

    if (!this.icon_validator.check(file)) {
      input.value = '';  // reset
      this.update_icon_error = this.icon_validator.error;
      return;
    }

    if (this.cid === undefined) {
      return;
    }

    this.updating_icon = true;
    this.adminService.update_oauth_client_icon(this.cid, file).pipe(
      finalize(() => {
        this.updating_icon = false;
        input.value = '';  // reset
      })
    ).subscribe({
      next: (user) => {
        this.setClient(user);
        this.update_icon_success = true
      },
      error: (error) => this.update_icon_error = error.error
    })
  }

  setPublic(is_public: boolean) {
    this.error = undefined;
    this.admin_operation_success = undefined;

    if (this.cid === undefined) {
      return;
    }

    this.setting_public = true;
    this.adminService.client_set_public(this.cid, is_public).pipe(
      finalize(() => this.setting_public = false)
    ).subscribe({
      next: () => {
        this.loadClient();
        this.admin_operation_success = {msg: 'Client access control updated successfully'}
      },
      error: (error) => this.error = error.error
    })
  }

  searchGroup(name: string) {
    this.group_search_names.next(name)
  }

  private setupUserSearch() {
    this.group_search_names.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((name: string) => {
        if (!name)
          return of(null);
        return this.adminService.search_group_by_name(name, 10)
      })
    ).subscribe({
      next: (results) => this.group_search_results = results,
      error: (error) => this.add_allowed_group_error = error.error
    });
  }

  addAllowedGroup(group: GroupAdvanced, index: number, btn: HTMLElement) {
    this.add_allowed_group_error = undefined;
    this.added_allowed_group = undefined;

    if (this.cid === undefined) {
      return;
    }

    btn.classList.add('disabled', 'loading');
    this.adminService.client_add_allowed_group(this.cid, group.id).pipe(
      finalize(() => btn.classList.remove('disabled', 'loading'))
    ).subscribe({
      next: () => {
        this.added_allowed_group = group;
        if (this.client) {
          this.client.allowed_groups.push(group);
        }
        //btn.outerHTML = '<a class="ui green icon button"><i class="check icon"></i></a>'
      },
      error: (error) => this.add_allowed_group_error = error.error
    })
  }

  removeAllowedGroup(group: Group, index: number, btn: HTMLElement) {
    this.remove_allowed_group_error = undefined;
    this.removed_allowed_group = undefined;

    if (this.cid === undefined) {
      return;
    }

    btn.classList.add('disabled', 'loading');
    this.adminService.client_remove_allowed_group(this.cid, group.id).pipe(
      finalize(() => btn.classList.remove('disabled', 'loading'))
    ).subscribe({
      next: () => {
        if (this.client) {
          this.client.allowed_groups.splice(index, 1);
        }
        this.removed_allowed_group = group as GroupAdvanced;
      },
      error: (error) => this.remove_allowed_group_error = error.error
    })
  }

  groupAlreadyAllowed(group: GroupAdvanced): boolean {
    if (this.client) {
      for (let g of this.client.allowed_groups) {
        if (g.id == group.id)
          return true;
      }
    }
    return false;
  }

}
