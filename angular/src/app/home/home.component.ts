import {Component, OnInit} from '@angular/core';
import {BasicError, OAuthClient, User} from "../models";
import {AccountService} from "../account.service";
import {finalize} from "rxjs/operators";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.less']
})
export class HomeComponent implements OnInit {
  error: BasicError;
  user: User;
  isAdmin: boolean;
  loadingClients: boolean;
  clients: OAuthClient[];

  constructor(
    private accountService: AccountService
  ) {
  }

  ngOnInit() {
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
          clients => this.clients = clients,
          error => this.error = error.error
        )
      },
      error=>this.error=error.error
    )
  }

}
