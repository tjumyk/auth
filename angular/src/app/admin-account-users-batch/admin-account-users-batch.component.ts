import {Component, OnDestroy, OnInit} from '@angular/core';
import {BasicError, ExternalAuthProvider, GroupAdvanced, UserAdvanced} from "../models";
import {AdminService, InviteForm} from "../admin.service";
import {debounceTime, finalize, switchMap} from "rxjs/operators";
import {Observable, of, Subject} from "rxjs";
import {TitleService} from "../title.service";
import {AccountService} from "../account.service";
import {FormsModule} from "@angular/forms";
import {NgClass, NgForOf, NgIf, NgStyle, PercentPipe} from "@angular/common";

export class BatchedUserItem {
  form?: InviteForm;
  clientError?: BasicError;
  serverError?: BasicError | null;
  success?: string | null;
  user?: UserAdvanced | null;
  processing?: boolean;
  waiting?: boolean;
}

@Component({
  selector: 'app-admin-account-users-batch',
  templateUrl: './admin-account-users-batch.component.html',
  imports: [
    FormsModule,
    NgIf,
    NgClass,
    NgForOf,
    NgStyle,
    PercentPipe
  ],
  styleUrls: ['./admin-account-users-batch.component.less']
})
export class AdminAccountUsersBatchComponent implements OnInit, OnDestroy {
  error: BasicError | undefined;

  format: string;
  userRawList: string | undefined;
  emailPrefix: string = '';
  emailSuffix: string = '';

  userListUpdated = new Subject();
  inputDebounceTime: number = 300;
  userItems: BatchedUserItem[] = [];

  examples: {[key: string]: string} = {
    csv: "For example:\n\nz3480000\nz3480001,jim@gmail.com\n   z3480002   ,    tom@gmail.com\nz3480003\n\n\nz3480004\nz3480005",
    tsv: "For example:\n\nz3480000\nz3480001\tjim@gmail.com\n   z3480002   \t    tom@gmail.com\nz3480003\n\n\nz3480004\nz3480005",
    json: "For example:\n\n[\n" +
      "    {\n" +
      "      \"name\": \"z3480000\"\n" +
      "    },\n" +
      "    {\n" +
      "      \"name\": \"z3480001\",\n" +
      "      \"email\": \"jim@gmail.com\"\n" +
      "    },\n" +
      "    {\n" +
      "      \"name\": \"z3480002\",\n" +
      "      \"email\": \"tom@gmail.com\"\n" +
      "    },\n" +
      "    {\n" +
      "      \"name\": \"z3480003\"\n" +
      "    }\n" +
      "  ]"
  };

  groups: GroupAdvanced[] | undefined;
  loadingGroups: boolean | undefined;
  selectedGroup: GroupAdvanced | undefined;

  processing: boolean | undefined;
  findingUsers: boolean | undefined;
  invitingUsers: boolean | undefined;
  deletingUsers: boolean | undefined;
  addingUsersToGroup: boolean | undefined;
  removingUsersFromGroup: boolean | undefined;

  processed: number | undefined;
  aborting: boolean | undefined;
  processDelay: number = 300;

  external_auth_providers: ExternalAuthProvider[] | undefined;
  external_auth_provider_id: ExternalAuthProvider | undefined;
  skip_email_confirmation: boolean | undefined;

  constructor(
    private accountService: AccountService,
    private adminService: AdminService,
    private titleService: TitleService
  ) {
    this.format = 'csv'; // default format
  }

  ngOnInit() {
    this.titleService.setTitle('User Batch Operations', 'Management');

    // directly load all the groups for quicker development
    this.loadingGroups = true;
    this.adminService.get_group_list().pipe(
      finalize(() => this.loadingGroups = false)
    ).subscribe({
      next: groups => this.groups = groups,
      error: error => this.error = error.error
    });

    this.accountService.get_external_auth_providers().subscribe({
      next: providers => this.external_auth_providers = providers,
      error: error => this.error = error.error
    });

    this.userListUpdated.pipe(
      debounceTime(this.inputDebounceTime),
      switchMap(() => of(this.parseUserList(this.userRawList)))
    ).subscribe({
      next: items => this.userItems = items,
      error: error => this.error = error.error
    })
  }

  ngOnDestroy(): void {
    if (this.processing) {
      this.aborting = true;
    }
  }

  updateUserList() {
    this.userListUpdated.next(1)
  }

  reloadUserList() {
    this.userItems = this.parseUserList(this.userRawList)
  }

  private parseUserList(rawList: string | undefined): BatchedUserItem[] {
    if (rawList === undefined || !rawList) {
      return [];
    }

    if (this.format == 'csv')
      return this.parseLines(rawList, ',');
    if (this.format == 'tsv')
      return this.parseLines(rawList, '\t');
    if (this.format == 'json')
      return this.parseJson(rawList);

    this.error = {msg: 'unsupported format', detail: this.format};
    return []
  }

  private parseLines(rawList: string, columnSplitter: string | RegExp): BatchedUserItem[] {
    const items: BatchedUserItem[] = [];

    let lineNum = 0;
    for (let line of rawList.split('\n')) {
      ++lineNum;
      line = line.trim();
      if (!line)
        continue;
      const columns = line.split(columnSplitter);
      try {
        let name = columns[0];
        if (name)
          name = name.trim();
        let email = columns[1];
        if (email)
          email = email.trim();
        items.push(this.createItem(name, email))
      } catch (e: any) {
        items.push({
          clientError: {
            msg: `[Parse Error] ${e.message} (Line: ${lineNum})`
          }
        })
      }
    }
    return items;
  }

  private parseJson(rawList: string): BatchedUserItem[] {
    const items: BatchedUserItem[] = [];
    try {
      const json = JSON.parse(rawList);

      if (!json.hasOwnProperty('length')) {
        items.push({
          clientError: {
            msg: `[Parse Error] Not a JSON list`
          }
        });
      } else {
        for (let obj of json) {
          try {
            items.push(this.createItem(obj.name, obj.email))
          } catch (e: any) {
            items.push({
              clientError: {
                msg: `[Parse Error] ${e.message}`
              }
            })
          }
        }
      }
    } catch (e: any) {
      items.push({
        clientError: {
          msg: `[Parse Error] ${e.message}`
        }
      });
    }
    return items;
  }

  private createItem(name: string, email?: string): BatchedUserItem {
    if (!name)
      throw Error(`Name is required`);
    if (!email) {
      email = `${this.emailPrefix}${name}${this.emailSuffix}`
    }

    return {
      form: {
        name: name,
        email: email
      }
    };
  }

  findUsers() {
    this.processUsers(
      () => this.findingUsers = true,
      () => this.findingUsers = false,
      (item) => {
        if (item.form === undefined || item.form.name === undefined) {
          return of(null);
        }
        return this.adminService.get_user_by_name(item.form.name)
      },
      (item, user) => {
        if (user !== null) {
          item.user = user;
          item.success = 'Found'
        }
      }
    )
  }

  inviteUsers() {
    this.processUsers(
      () => this.invitingUsers = true,
      () => this.invitingUsers = false,
      (item) => {
        if (item.form === undefined) {
          return of(null);
        }
        // copy global invitation options to the current form
        item.form.skip_email_confirmation = this.skip_email_confirmation;
        item.form.external_auth_provider_id = this.external_auth_provider_id;
        return this.adminService.invite_user(item.form)
      },
      (item, user) => {
        if (user !== null) {
          item.user = user;
          item.success = 'Invited'
        }
      }
    )
  }

  deleteUsers() {
    if (!confirm(`Really want to delete the users?`))
      return;

    this.processUsers(
      () => this.deletingUsers = true,
      () => this.deletingUsers = false,
      (item) => {
        if (item.form === undefined || item.form.name === undefined) {
          return of(null);
        }
        return this.adminService.delete_user_by_name(item.form.name)
      },
      (item) => {
        item.user = null;
        item.success = 'Deleted';
      }
    )
  }

  addUsersToGroup() {
    if (!this.selectedGroup) {
      alert('Please select a group first');
      return;
    }

    this.processUsers(
      () => this.addingUsersToGroup = true,
      () => this.addingUsersToGroup = false,
      (item) => {
        if (this.selectedGroup === undefined || item.form === undefined || item.form.name === undefined) {
          return of(null);
        }
        return this.adminService.group_add_user_by_name(this.selectedGroup.id, item.form.name)
      },
      (item) => {
        if (this.selectedGroup === undefined) {
          return;
        }
        item.success = `Added to group "${this.selectedGroup.name}"`
      }
    )
  }

  removeUsersFromGroup() {
    if (!this.selectedGroup) {
      alert('Please select a group first');
      return;
    }

    this.processUsers(
      () => this.removingUsersFromGroup = true,
      () => this.removingUsersFromGroup = false,
      (item) => {
        if (this.selectedGroup === undefined || item.form === undefined || item.form.name === undefined) {
          return of(null);
        }
        return this.adminService.group_remove_user_by_name(this.selectedGroup.id, item.form.name)
      },
      (item) => {
        if (this.selectedGroup === undefined) {
          return;
        }
        item.success = `Removed from group "${this.selectedGroup.name}"`
      }
    )
  }

  private processUsers(onStart: () => void,
                       onStop: () => void,
                       onItem: (item: BatchedUserItem) => Observable<any>,
                       onSuccess: (item: BatchedUserItem, result: any) => void) {
    if (!this.userItems || !this.userItems.length) {
      alert('Input has no users');
      return
    }
    if (this.hasClientErrors()) {
      alert('Input has errors');
      return
    }

    const process_next = () => {
      if (this.processed === undefined) {
        return;
      }
      if (this.aborting || this.processed >= this.userItems.length) {
        this.processing = false;
        this.aborting = false;
        onStop();
        return;
      }

      const item = this.userItems[this.processed];
      item.processing = false;
      item.waiting = true;
      item.serverError = null;
      item.success = null;
      // item.user is cached

      setTimeout(() => {
        item.processing = true;
        item.waiting = false;

        onItem(item).pipe(
          finalize(() => {
            item.processing = false;
            if (this.processed !== undefined) {
              ++this.processed;
            }
            process_next()
          })
        ).subscribe({
          next: result => onSuccess(item, result),
          error: error => {
            let errorMessage = error.error;
            if (errorMessage instanceof ProgressEvent) {
              errorMessage = {
                msg: 'connection failed'
              };
            }
            if (!errorMessage || !errorMessage.msg) {
              errorMessage = {
                msg: 'internal error'
              };
            }
            item.serverError = errorMessage
          }
        })
      }, this.processDelay);
    };

    this.aborting = false;
    this.processing = true;
    this.processed = 0;
    onStart();
    process_next();
  }

  private hasClientErrors() {
    for (let item of this.userItems) {
      if (item.clientError)
        return true;
    }
    return false;
  }

  groupCompareFn(g1: GroupAdvanced, g2: GroupAdvanced): boolean {
    return g1 && g2 ? g1.id === g2.id : g1 === g2
  }

  onChangeProvider() {
    if (!this.external_auth_provider_id) {
      this.skip_email_confirmation = undefined;
    }
  }
}
