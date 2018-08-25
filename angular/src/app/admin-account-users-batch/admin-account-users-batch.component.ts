import {Component, OnInit} from '@angular/core';
import {BasicError, GroupAdvanced, UserAdvanced} from "../models";
import {AdminService} from "../admin.service";
import {debounceTime, delay, distinctUntilChanged, finalize, switchMap} from "rxjs/operators";
import {Observable, of, Subject} from "rxjs";
import {TitleService} from "../title.service";

export class InviteUserForm {
  name: string;
  email: string;
}

export class BatchedUserItem {
  form: InviteUserForm;
  clientError?: BasicError;
  serverError?: BasicError;
  success?: string;
  user?: UserAdvanced;
  processing?: boolean;
}

@Component({
  selector: 'app-admin-account-users-batch',
  templateUrl: './admin-account-users-batch.component.html',
  styleUrls: ['./admin-account-users-batch.component.less']
})
export class AdminAccountUsersBatchComponent implements OnInit {
  error: BasicError;

  format: string;
  userRawList: string;
  emailPrefix: string = '';
  emailSuffix: string = '';

  userListUpdated = new Subject();
  inputDebounceTime: number = 300;
  userItems: BatchedUserItem[] = [];

  examples = {
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

  groups: GroupAdvanced[];
  loadingGroups: boolean;
  selectedGroup: GroupAdvanced;

  processing: boolean;
  findingUsers: boolean;
  invitingUsers: boolean;
  deletingUsers: boolean;
  addingUsersToGroup: boolean;
  removingUsersFromGroup: boolean;

  processed: number;
  aborting: boolean;
  processDelay: number = 300;

  constructor(
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
    ).subscribe(
      groups => this.groups = groups,
      error => this.error = error.error
    );

    this.userListUpdated.pipe(
      debounceTime(this.inputDebounceTime),
      switchMap(() => of(this.parseUserList(this.userRawList)))
    ).subscribe(
      items => this.userItems = items,
      error => this.error = error.error
    )
  }

  updateUserList() {
    this.userListUpdated.next()
  }

  reloadUserList() {
    this.userItems = this.parseUserList(this.userRawList)
  }

  private parseUserList(rawList: string): BatchedUserItem[] {
    if (!rawList) {
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
    const items = [];

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
      } catch (e) {
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
    const items = [];
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
          } catch (e) {
            items.push({
              clientError: {
                msg: `[Parse Error] ${e.message}`
              }
            })
          }
        }
      }
    } catch (e) {
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
      (item) => this.adminService.get_user_by_name(item.form.name),
      (item, user) => {
        item.user = user;
        item.success = 'Found'
      }
    )
  }

  inviteUsers() {
    this.processUsers(
      () => this.invitingUsers = true,
      () => this.invitingUsers = false,
      (item) => this.adminService.invite_user(item.form.name, item.form.email),
      (item, user) => {
        item.user = user;
        item.success = 'Invited'
      }
    )
  }

  deleteUsers() {
    if (!confirm(`Really want to delete the users?`))
      return;

    this.processUsers(
      () => this.deletingUsers = true,
      () => this.deletingUsers = false,
      (item) => this.adminService.delete_user_by_name(item.form.name),
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
      (item) => this.adminService.group_add_user_by_name(this.selectedGroup.id, item.form.name),
      (item) => item.success = `Added to group "${this.selectedGroup.name}"`
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
      (item) => this.adminService.group_remove_user_by_name(this.selectedGroup.id, item.form.name),
      (item) => item.success = `Removed from group "${this.selectedGroup.name}"`
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
      if (this.aborting || this.processed >= this.userItems.length) {
        this.processing = false;
        this.aborting = false;
        onStop();
        return;
      }

      const item = this.userItems[this.processed];
      item.processing = true;
      item.serverError = null;
      item.success = null;
      // item.user is cached

      setTimeout(() => {
        onItem(item).pipe(
          finalize(() => {
            item.processing = false;
            ++this.processed;
            process_next()
          })
        ).subscribe(
          result => onSuccess(item, result),
          error => {
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
        )
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

}
