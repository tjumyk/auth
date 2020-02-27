import {Component, OnInit} from '@angular/core';
import {TitleService} from "../title.service";
import {AdminService} from "../admin.service";
import {BasicError, SendEmailForm} from "../models";
import {NgForm} from "@angular/forms";
import {finalize} from "rxjs/operators";

@Component({
  selector: 'app-admin-email-send',
  templateUrl: './admin-email-send.component.html',
  styleUrls: ['./admin-email-send.component.less']
})
export class AdminEmailSendComponent implements OnInit {
  success: string;
  error: BasicError;
  form: SendEmailForm = new SendEmailForm();
  sending: boolean;

  constructor(
    private titleService: TitleService,
    private adminService: AdminService) {
  }

  ngOnInit() {
    this.titleService.setTitle('Send Email', 'Management');
  }

  send(f: NgForm) {
    if (f.invalid)
      return;

    this.sending = true;
    this.adminService.send_email(this.form).pipe(
      finalize(() => this.sending = false)
    ).subscribe(
      resp => {
        this.success = `Email has been sent to ${resp.num_recipients} users`
      },
      error => this.error = error.error
    )
  }
}
