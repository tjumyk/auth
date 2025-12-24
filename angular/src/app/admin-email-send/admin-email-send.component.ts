import {Component, OnInit} from '@angular/core';
import {TitleService} from "../title.service";
import {AdminService, SendEmailForm} from "../admin.service";
import {BasicError} from "../models";
import {FormsModule, NgForm} from "@angular/forms";
import {finalize} from "rxjs/operators";
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-admin-email-send',
  templateUrl: './admin-email-send.component.html',
  imports: [
    NgIf,
    FormsModule
  ],
  styleUrls: ['./admin-email-send.component.less']
})
export class AdminEmailSendComponent implements OnInit {
  success: string | undefined;
  error: BasicError | undefined;
  form: SendEmailForm = new SendEmailForm();
  sending: boolean | undefined;

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
    ).subscribe({
      next: resp => {
        this.success = `Email has been sent to ${resp.num_recipients} users`
      },
      error: error => this.error = error.error
    })
  }
}
