import {Component, OnInit} from '@angular/core';
import {BasicError, OAuthClient, User} from "../models";
import {AccountService} from "../account.service";
import {finalize} from "rxjs/operators";
import {TitleService} from "../title.service";
import {environment} from '../../environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.less']
})
export class HomeComponent implements OnInit {
  readonly env = environment;
  error: BasicError;
  user: User;
  isAdmin: boolean;
  loadingClients: boolean;
  checkingIP: boolean;
  clients: OAuthClient[];

  constructor(
    private accountService: AccountService,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle();

    this.accountService.get_current_user().subscribe(
      user=>{
        this.user = user;

        this.isAdmin=false;
        for(let group of user.groups){
          if(group.name == 'admin'){
            this.isAdmin = true;
            break;
          }
        }

        this.loadingClients = true;
        this.accountService.get_my_clients().pipe(
          finalize(() => this.loadingClients = false)
        ).subscribe(
          clients => {
            this.clients = clients;

            this.checkingIP = true;
            this.accountService.check_ip().pipe(
              finalize(() => this.checkingIP = false)
            ).subscribe(
              result => {
                if (!result || result.check_pass || !result.guarded_ports || result.guarded_ports.length === 0) {
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
                  client._is_ip_blocked = guardedPortSet.has(portNum);
                }
              },
              error => this.error = error.error
            );
          },
          error => this.error = error.error
        )
      },
      error=>this.error=error.error
    )
  }

}
