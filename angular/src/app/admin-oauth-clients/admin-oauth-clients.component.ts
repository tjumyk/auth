import { Component, OnInit } from '@angular/core';
import {BasicError, OAuthClientAdvanced, UserAdvanced} from "../models";
import {AdminService} from "../admin.service";
import {finalize} from "rxjs/operators";
import {TitleService} from "../title.service";

@Component({
  selector: 'app-admin-oauth-clients',
  templateUrl: './admin-oauth-clients.component.html',
  styleUrls: ['./admin-oauth-clients.component.less']
})
export class AdminOauthClientsComponent implements OnInit {

  error: BasicError;
  loading_client_list: boolean;

  client_list: OAuthClientAdvanced[] = [];

  constructor(
    private adminService: AdminService,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('OAuth Clients', 'Management');

    this.loading_client_list = true;
    this.adminService.get_oauth_clients().pipe(
      finalize(() => this.loading_client_list = false)
    ).subscribe(
      (user_list) => this.client_list = user_list,
      (error) => this.error = error.error
    )
  }

  deleteClient(client: OAuthClientAdvanced, index: number, btn: HTMLElement) {
    if (!confirm(`Really want to delete client ${client.name}?`))
      return;

    btn.classList.add('loading', 'disabled');
    this.adminService.delete_oauth_client(client.id).pipe(
      finalize(() => btn.classList.remove('loading', 'disabled'))
    ).subscribe(
      () => this.client_list.splice(index, 1),
      (error) => this.error = error.error
    )
  }
}
