import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Logger, LogService} from "./log.service";
import {Observable} from "rxjs/internal/Observable";
import {GroupAdvanced, LoginRecord, OAuthClientAdvanced, UserAdvanced} from "./models";
import {map, tap} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private api: string = 'api/admin';
  private logger: Logger;

  constructor(
    private http: HttpClient,
    private logService: LogService
  ) {
    this.logger = logService.get_logger('AdminService')
  }

  get_user_list(): Observable<UserAdvanced[]> {
    return this.http.get(`${this.api}/users`).pipe(
      map((data) => {
        let group_dict: { [gid: number]: GroupAdvanced } = {};
        for (let group  of data['groups']) {
          let g = group as GroupAdvanced;
          group_dict[g.id] = g
        }
        let users: UserAdvanced[] = [];
        for (let user of data['users']) {
          let groups = [];
          for (let gid of user['group_ids']) {
            groups.push(group_dict[gid])
          }
          user['groups'] = groups;
          let u = user as UserAdvanced;
          users.push(u)
        }
        return users
      }),
      tap((user_list) => this.logger.info(`Fetched user list (${user_list.length} users)`))
    )
  }

  invite_user(name: string, email: string): Observable<UserAdvanced> {
    return this.http.post<UserAdvanced>(`${this.api}/users`, {name: name, email: email}).pipe(
      tap((user: UserAdvanced) => this.logger.info(`Invited user ${user.name} (${user.email})`))
    )
  }

  get_user(uid: number): Observable<UserAdvanced> {
    return this.http.get<UserAdvanced>(`${this.api}/users/${uid}`).pipe(
      tap((user) => this.logger.info(`Fetched profile of user ${user.name}`))
    )
  }

  delete_user(uid: number): Observable<any> {
    return this.http.delete(`${this.api}/users/${uid}`).pipe(
      tap(() => this.logger.info(`Deleted user (uid: ${uid})`))
    )
  }

  set_user_active(uid: number, is_active: boolean): Observable<any> {
    if (is_active) {
      return this.http.post(`${this.api}/users/${uid}/active`, null).pipe(
        tap(() => this.logger.info(`Set user (uid: ${uid}) as active`))
      )
    } else {
      return this.http.delete(`${this.api}/users/${uid}/active`).pipe(
        tap(() => this.logger.info(`Set user (uid: ${uid}) as inactive`))
      )
    }
  }

  update_user_profile(uid: number, nickname: string): Observable<UserAdvanced> {
    return this.http.put<UserAdvanced>(`${this.api}/users/${uid}`, {nickname: nickname}).pipe(
      tap((user) => this.logger.info(`Updated profile of user ${user.name}`))
    )
  }

  update_user_avatar(uid: number, avatar: File): Observable<UserAdvanced> {
    let form = new FormData();
    form.append('avatar', avatar);
    return this.http.put<UserAdvanced>(`${this.api}/users/${uid}`, form).pipe(
      tap((user: UserAdvanced) => this.logger.info(`Updated avatar of user ${user.name}`))
    )
  }

  reconfirm_email(uid: number): Observable<any> {
    return this.http.post(`${this.api}/users/${uid}/reconfirm-email`, null).pipe(
      tap(() => this.logger.info(`Restarted email confirmation for user (uid:${uid})`))
    )
  }

  get_user_login_records(uid: number): Observable<LoginRecord[]> {
    return this.http.get<LoginRecord[]>(`${this.api}/users/${uid}/login-records`).pipe(
      tap((records: LoginRecord[]) => {
        this.logger.info(`Fetched login records of user (uid: ${uid}) (${records.length} records)`);
      })
    )
  }

  get_group_list(): Observable<GroupAdvanced[]> {
    return this.http.get<GroupAdvanced[]>(`${this.api}/groups`).pipe(
      tap((groups) => this.logger.info(`Fetched group list (${groups.length} groups)`))
    )
  }

  add_group(name: string, description: string): Observable<GroupAdvanced> {
    return this.http.post<GroupAdvanced>(`${this.api}/groups`, {name: name, description: description}).pipe(
      tap((group) => this.logger.info(`Added new group ${group.name}`))
    )
  }

  get_group(gid: number): Observable<GroupAdvanced> {
    return this.http.get<GroupAdvanced>(`${this.api}/groups/${gid}`).pipe(
      tap((group) => this.logger.info(`Fetched profile of group ${group.name}`))
    )
  }

  delete_group(gid: number): Observable<any> {
    return this.http.delete(`${this.api}/groups/${gid}`).pipe(
      tap(() => this.logger.info(`Deleted group (gid: ${gid})`))
    )
  }

  update_group(gid: number, description: string): Observable<GroupAdvanced> {
    return this.http.put<GroupAdvanced>(`${this.api}/groups/${gid}`, {description: description}).pipe(
      tap((group) => this.logger.info(`Updated profile of group ${group.name}`))
    )
  }

  group_add_user(gid: number, uid: number): Observable<any> {
    return this.http.post(`${this.api}/groups/${gid}/users/${uid}`, null).pipe(
      tap(() => this.logger.info(`Added user (uid: ${uid}) to group (gid: ${gid})`))
    )
  }

  group_remove_user(gid: number, uid: number): Observable<any> {
    return this.http.delete(`${this.api}/groups/${gid}/users/${uid}`, null).pipe(
      tap(() => this.logger.info(`Removed user (uid: ${uid}) from group (gid: ${gid})`))
    )
  }

  get_oauth_clients(): Observable<OAuthClientAdvanced[]> {
    return this.http.get<OAuthClientAdvanced[]>(`${this.api}/clients`).pipe(
      tap((clients) => this.logger.info(`Fetched OAuth client list (${clients.length} clients)`))
    )
  }

  add_oauth_client(name: string, redirect_url: string, home_url: string, description: string): Observable<OAuthClientAdvanced> {
    return this.http.post<OAuthClientAdvanced>(`${this.api}/clients`, {
      name: name,
      redirect_url: redirect_url,
      home_url: home_url,
      description: description
    }).pipe(
      tap((client) => this.logger.info(`Created new OAuth client ${client.name}`))
    )
  }

  get_oauth_client(cid: number): Observable<OAuthClientAdvanced> {
    return this.http.get<OAuthClientAdvanced>(`${this.api}/clients/${cid}`).pipe(
      tap((client) => this.logger.info(`Fetched profile of OAuth client ${client.name}`))
    )
  }

  delete_oauth_client(cid: number): Observable<any> {
    return this.http.delete(`${this.api}/clients/${cid}`).pipe(
      tap(() => this.logger.info(`Deleted OAuth client (cid: ${cid})`))
    )
  }

  update_oauth_client_profile(cid: number, redirect_url: string, home_url: string, description: string): Observable<OAuthClientAdvanced> {
    return this.http.put<OAuthClientAdvanced>(`${this.api}/clients/${cid}`, {
      redirect_url: redirect_url,
      home_url: home_url,
      description: description
    }).pipe(
      tap((client) => this.logger.info(`Updated profile of OAuth client ${client.name}`))
    )
  }

  update_oauth_client_icon(cid: number, icon: File): Observable<OAuthClientAdvanced> {
    let form = new FormData();
    form.append('icon', icon);
    return this.http.put<OAuthClientAdvanced>(`${this.api}/clients/${cid}`, form).pipe(
      tap((client) => this.logger.info(`Updated avatar of OAuth client ${client.name}`))
    )
  }

  client_regenerate_secret(cid: number): Observable<OAuthClientAdvanced> {
    return this.http.post<OAuthClientAdvanced>(`${this.api}/clients/${cid}/regenerate-secret`, null).pipe(
      tap((client) => this.logger.info(`Regenerated secret for OAuth client ${client.name}`))
    )
  }
}