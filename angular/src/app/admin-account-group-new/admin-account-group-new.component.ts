import {Component, OnInit} from '@angular/core';
import {BasicError} from "../models";
import {NgForm} from "@angular/forms";
import {AdminService} from "../admin.service";
import {finalize} from "rxjs/operators";
import {ActivatedRoute, Router} from "@angular/router";

class NewGroupForm {
  name: string;
  description: string;
}

@Component({
  selector: 'app-admin-account-group-new',
  templateUrl: './admin-account-group-new.component.html',
  styleUrls: ['./admin-account-group-new.component.less']
})
export class AdminAccountGroupNewComponent implements OnInit {
  error: BasicError;
  requesting: boolean;

  form: NewGroupForm = new NewGroupForm();

  constructor(
    private adminService: AdminService,
    private router: Router,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit() {
  }

  newGroup(f: NgForm) {
    if (f.invalid)
      return;

    this.error = undefined;

    this.requesting = true;
    this.adminService.add_group(this.form.name, this.form.description).pipe(
      finalize(() => this.requesting = false)
    ).subscribe(
      (group) => this.router.navigate([`../g/${group.id}`], {relativeTo: this.route}),
      (error) => this.error = error.error
    )
  }
}
