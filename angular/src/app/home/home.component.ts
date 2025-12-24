import {Component, OnInit} from '@angular/core';
import {BasicError, OAuthClient, User} from "../models";
import {AccountService} from "../account.service";
import {finalize} from "rxjs/operators";
import {TitleService} from "../title.service";
import {environment} from '../../environments/environment';
import {RouterLink} from "@angular/router";
import {NgForOf, NgIf} from "@angular/common";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  imports: [
    RouterLink,
    NgIf,
    NgForOf
  ],
  styleUrls: ['./home.component.less']
})
export class HomeComponent implements OnInit {
  readonly env = environment;
  error: BasicError | undefined;
  user: User | undefined;
  isAdmin: boolean | undefined;
  loadingClients: boolean | undefined;
  checkingIP: boolean | undefined;
  clients: OAuthClient[] | undefined;
  hasIPBlockedClient: boolean | undefined;
  gateClient: OAuthClient | undefined;

  constructor(
    private accountService: AccountService,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle();

    this.accountService.get_current_user().subscribe({
      next: user => {
        this.user = user;

        this.isAdmin = false;
        if(user == null){
          return;
        }

        if (user.groups) {
          for (let group of user.groups) {
            if (group.name == 'admin') {
              this.isAdmin = true;
              break;
            }
          }
        }

        this.loadingClients = true;
        this.accountService.get_my_clients().pipe(
          finalize(() => this.loadingClients = false)
        ).subscribe({
          next: clients => {
            this.clients = clients;

            for (const client of this.clients) {
              if (client.name === 'gate') {
                this.gateClient = client;
              }
            }

            this.checkingIP = true;
            this.accountService.check_ip().pipe(
              finalize(() => this.checkingIP = false)
            ).subscribe({
              next: result => {
                if (!result || result.check_pass || !result.guarded_ports || result.guarded_ports.length === 0
                  || this.clients === undefined) {
                  return;
                }
                const guardedPortSet: Set<number> = new Set(result.guarded_ports);
                for (const client of this.clients) {
                  const url = client.home_url;
                  if (!url) {
                    continue;
                  }
                  const urlObj = new URL(url);
                  let port: string = urlObj.port;
                  if (!port) {
                    if (urlObj.protocol === 'http:') {
                      port = '80';
                    } else if (urlObj.protocol === 'https:') {
                      port = '443';
                    }
                  }
                  if (!port) {
                    continue;
                  }
                  const portNum = parseInt(port);
                  const isIpBlocked = guardedPortSet.has(portNum);
                  if (isIpBlocked) {
                    this.hasIPBlockedClient = true;
                  }
                  client._is_ip_blocked = isIpBlocked;
                }
              },
              error: error => this.error = error.error
            });
          },
          error: error => this.error = error.error
        })
      },
      error: error => this.error = error.error
    })
  }

}
