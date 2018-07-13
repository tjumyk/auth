import { Component, OnInit } from '@angular/core';
import {BasicError} from "../models";
import {AdminService} from "../admin.service";
import {ActivatedRoute, Router} from "@angular/router";
import {NgForm} from "@angular/forms";
import {finalize} from "rxjs/operators";

class NewClientForm{
  name: string;
  redirect_url: string;
  home_url: string;
  description: string;
}

@Component({
  selector: 'app-admin-oauth-client-new',
  templateUrl: './admin-oauth-client-new.component.html',
  styleUrls: ['./admin-oauth-client-new.component.less']
})
export class AdminOauthClientNewComponent implements OnInit {

  error: BasicError;
  requesting: boolean;

  form: NewClientForm=new NewClientForm();

  constructor(
    private adminService: AdminService,
    private router: Router,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit() {
  }

  newClient(f: NgForm) {
    if (f.invalid)
      return;

    this.error = undefined;

    this.requesting = true;
    this.adminService.add_oauth_client(this.form.name, this.form.redirect_url, this.form.home_url,
      this.form.description).pipe(
      finalize(() => this.requesting = false)
    ).subscribe(
      (group) => this.router.navigate([`../c/${group.id}`], {relativeTo: this.route}),
      (error) => this.error = error.error
    )
  }

}
