import {Component, OnInit} from '@angular/core';
import {BasicError, GroupAdvanced, OAuthAuthorization, OAuthClientAdvanced} from "../models";
import {AdminService} from "../admin.service";
import {ActivatedRoute, Router} from "@angular/router";
import {NgForm} from "@angular/forms";
import {UploadFilters, UploadValidator} from "../upload-util";
import {debounceTime, distinctUntilChanged, finalize, switchMap} from "rxjs/operators";
import {of, Subject} from "rxjs/index";

class ProfileForm {
  redirect_url: string;
  home_url: string;
  description: string;
}

@Component({
  selector: 'app-admin-oauth-client-edit',
  templateUrl: './admin-oauth-client-edit.component.html',
  styleUrls: ['./admin-oauth-client-edit.component.less']
})
export class AdminOauthClientEditComponent implements OnInit {
  loading_client: boolean;
  updating_profile: boolean;
  update_profile_success: boolean;
  updating_icon: boolean;
  update_icon_success: boolean;

  admin_operation_success: {
    msg: string,
    detail?: string
  };

  error: BasicError;
  update_profile_error: BasicError;
  update_icon_error: BasicError;

  add_allowed_group_error: BasicError;
  added_allowed_group: GroupAdvanced;
  remove_allowed_group_error: BasicError;
  removed_allowed_group: GroupAdvanced;

  group_search_results: GroupAdvanced[];
  private group_search_names = new Subject<string>();

  loading_authorizations: boolean;
  authorizations: OAuthAuthorization[];

  regenerating_secret: boolean;
  setting_public: boolean;
  deleting: boolean;

  icon_validator: UploadValidator;

  client: OAuthClientAdvanced;
  cid: number;
  form: ProfileForm = new ProfileForm();

  constructor(
    private adminService: AdminService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.icon_validator = new UploadValidator(UploadFilters.icon)
  }

  ngOnInit() {
    this.cid = parseInt(this.route.snapshot.paramMap.get('cid'));

    this.setupUserSearch();
    this.loadClient();
    this.loadAuthorizations();
  }

  private loadClient() {
    this.error = undefined;
    this.loading_client = true;
    this.adminService.get_oauth_client(this.cid).pipe(
      finalize(() => this.loading_client = false)
    ).subscribe(
      (client) => this.setClient(client),
      (error) => this.error = error.error
    );
  }

  private loadAuthorizations() {
    this.loading_authorizations = true;
    this.adminService.client_get_authorizations(this.cid).pipe(
      finalize(() => this.loading_authorizations = false)
    ).subscribe(
      (records) => this.authorizations = records,
      (error) => this.error = error.error
    )
  }

  private setClient(client: OAuthClientAdvanced) {
    this.client = client;

    this.form.redirect_url = client.redirect_url;
    this.form.home_url = client.home_url;
    this.form.description = client.description;
  }


  regenerateSecret() {
    if (!confirm(`Regenerating secret will break current authentication for ${this.client.name}. ` +
      `You must update the secret on the client side ASAP after this operation. Still proceed?`))
      return;

    this.error = undefined;
    this.admin_operation_success = undefined;

    this.regenerating_secret = true;
    this.adminService.client_regenerate_secret(this.cid).pipe(
      finalize(() => this.regenerating_secret = false)
    ).subscribe(
      () => {
        this.loadClient();
        this.admin_operation_success = {msg: 'Secret regenerated'}
      },
      (error) => this.error = error.error
    )
  }

  deleteClient() {
    if (!confirm(`Really want to delete client ${this.client.name}?`))
      return;

    this.deleting = true;
    this.adminService.delete_oauth_client(this.cid).pipe(
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
    this.adminService.update_oauth_client_profile(this.cid, this.form.redirect_url, this.form.home_url,
      this.form.description).pipe(
      finalize(() => this.updating_profile = false)
    ).subscribe(
      (user) => {
        this.setClient(user);
        this.update_profile_success = true
      },
      (error) => this.update_profile_error = error.error
    )
  }

  uploadIcon(input: HTMLInputElement) {
    let files = input.files;
    if (files.length == 0)
      return;

    this.update_icon_success = undefined;
    this.update_icon_error = undefined;

    let file = files.item(0);
    if (!this.icon_validator.check(file)) {
      input.value = '';  // reset
      this.update_icon_error = this.icon_validator.error;
      return;
    }

    this.updating_icon = true;
    this.adminService.update_oauth_client_icon(this.cid, file).pipe(
      finalize(() => {
        this.updating_icon = false;
        input.value = '';  // reset
      })
    ).subscribe(
      (user) => {
        this.setClient(user);
        this.update_icon_success = true
      },
      (error) => this.update_icon_error = error.error
    )
  }

  setPublic(is_public) {
    this.error = undefined;
    this.admin_operation_success = undefined;

    this.setting_public = true;
    this.adminService.client_set_public(this.cid, is_public).pipe(
      finalize(() => this.setting_public = false)
    ).subscribe(
      () => {
        this.loadClient();
        this.admin_operation_success = {msg: 'Client access control updated successfully'}
      },
      (error) => this.error = error.error
    )
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
    ).subscribe(
      (results) => this.group_search_results = results,
      (error) => this.add_allowed_group_error = error.error
    );
  }

  addAllowedGroup(group: GroupAdvanced, index: number, btn: HTMLElement) {
    this.add_allowed_group_error = undefined;
    this.added_allowed_group = undefined;

    btn.classList.add('disabled', 'loading');
    this.adminService.client_add_allowed_group(this.cid, group.id).pipe(
      finalize(() => btn.classList.remove('disabled', 'loading'))
    ).subscribe(
      () => {
        this.added_allowed_group = group;
        this.client.allowed_groups.push(group);
        //btn.outerHTML = '<a class="ui green icon button"><i class="check icon"></i></a>'
      },
      (error) => this.add_allowed_group_error = error.error
    )
  }

  removeAllowedGroup(group: GroupAdvanced, index: number, btn: HTMLElement) {
    this.remove_allowed_group_error = undefined;
    this.removed_allowed_group = undefined;

    btn.classList.add('disabled', 'loading');
    this.adminService.client_remove_allowed_group(this.cid, group.id).pipe(
      finalize(() => btn.classList.remove('disabled', 'loading'))
    ).subscribe(
      () => {
        this.client.allowed_groups.splice(index, 1);
        this.removed_allowed_group = group;
      },
      (error) => this.remove_allowed_group_error = error.error
    )
  }

  groupAlreadyAllowed(group: GroupAdvanced) {
    for (let g of this.client.allowed_groups) {
      if (g.id == group.id)
        return true;
    }
    return false;
  }

}
