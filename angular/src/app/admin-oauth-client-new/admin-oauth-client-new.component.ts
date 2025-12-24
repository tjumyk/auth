import {Component, OnInit} from '@angular/core';
import {BasicError} from "../models";
import {AdminService} from "../admin.service";
import {ActivatedRoute, Router} from "@angular/router";
import {FormsModule, NgForm} from "@angular/forms";
import {finalize} from "rxjs/operators";
import {TitleService} from "../title.service";
import {NgClass, NgIf} from "@angular/common";

class NewClientForm {
  name: string | undefined;
  redirect_url: string | undefined;
  home_url: string | undefined;
  description: string | undefined;
}

@Component({
  selector: 'app-admin-oauth-client-new',
  templateUrl: './admin-oauth-client-new.component.html',
  imports: [
    FormsModule,
    NgClass,
    NgIf
  ],
  styleUrls: ['./admin-oauth-client-new.component.less']
})
export class AdminOauthClientNewComponent implements OnInit {

  error: BasicError | undefined;
  requesting: boolean | undefined;

  form: NewClientForm = new NewClientForm();

  constructor(
    private adminService: AdminService,
    private router: Router,
    private route: ActivatedRoute,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('New OAuth Client', ' Management')
  }

  newClient(f: NgForm) {
    if (f.invalid || this.form.name === undefined || this.form.redirect_url === undefined
      || this.form.home_url === undefined || this.form.description === undefined)
      return;

    this.error = undefined;

    this.requesting = true;
    this.adminService.add_oauth_client(this.form.name, this.form.redirect_url, this.form.home_url,
      this.form.description).pipe(
      finalize(() => this.requesting = false)
    ).subscribe({
      next: (group) => this.router.navigate([`../c/${group.id}`], {relativeTo: this.route}),
      error: (error) => this.error = error.error
    })
  }

}
