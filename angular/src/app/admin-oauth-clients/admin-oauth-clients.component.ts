import {Component, OnInit} from '@angular/core';
import {BasicError, OAuthClientAdvanced, UserAdvanced} from "../models";
import {AdminService} from "../admin.service";
import {finalize} from "rxjs/operators";
import {TitleService} from "../title.service";
import {NgForOf, NgIf} from "@angular/common";
import {RouterLink} from "@angular/router";

@Component({
  selector: 'app-admin-oauth-clients',
  templateUrl: './admin-oauth-clients.component.html',
  imports: [
    NgIf,
    RouterLink,
    NgForOf
  ],
  styleUrls: ['./admin-oauth-clients.component.less']
})
export class AdminOauthClientsComponent implements OnInit {

  error: BasicError | undefined;
  loading_client_list: boolean | undefined;

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
    ).subscribe({
      next: (user_list) => this.client_list = user_list,
      error: (error) => this.error = error.error
    })
  }

  deleteClient(client: OAuthClientAdvanced, index: number, btn: HTMLElement) {
    if (!confirm(`Really want to delete client ${client.name}?`))
      return;

    btn.classList.add('loading', 'disabled');
    this.adminService.delete_oauth_client(client.id).pipe(
      finalize(() => btn.classList.remove('loading', 'disabled'))
    ).subscribe({
      next: () => this.client_list.splice(index, 1),
      error: (error) => this.error = error.error
    })
  }
}
