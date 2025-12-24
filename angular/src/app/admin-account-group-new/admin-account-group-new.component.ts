import {Component, OnInit} from '@angular/core';
import {BasicError} from "../models";
import {FormsModule, NgForm} from "@angular/forms";
import {AdminService} from "../admin.service";
import {finalize} from "rxjs/operators";
import {ActivatedRoute, Router} from "@angular/router";
import {TitleService} from "../title.service";
import {NgClass, NgIf} from "@angular/common";

class NewGroupForm {
  name: string | undefined;
  description: string | undefined;
}

@Component({
  selector: 'app-admin-account-group-new',
  templateUrl: './admin-account-group-new.component.html',
  imports: [
    FormsModule,
    NgClass,
    NgIf
  ],
  styleUrls: ['./admin-account-group-new.component.less']
})
export class AdminAccountGroupNewComponent implements OnInit {
  error: BasicError | undefined;
  requesting: boolean | undefined;

  form: NewGroupForm = new NewGroupForm();

  constructor(
    private adminService: AdminService,
    private router: Router,
    private route: ActivatedRoute,
    private titleService: TitleService
  ) {
  }

  ngOnInit() {
    this.titleService.setTitle('New Group', 'Management')
  }

  newGroup(f: NgForm) {
    if (f.invalid || this.form.name === undefined || this.form.description === undefined)
      return;

    this.error = undefined;

    this.requesting = true;
    this.adminService.add_group(this.form.name, this.form.description).pipe(
      finalize(() => this.requesting = false)
    ).subscribe({
      next: (group) => this.router.navigate([`../g/${group.id}`], {relativeTo: this.route}),
      error: (error) => this.error = error.error
    })
  }
}
