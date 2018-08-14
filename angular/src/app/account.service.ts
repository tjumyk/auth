import {Injectable} from '@angular/core';
import {OAuthClient, User} from "./models";
import {HttpClient, HttpParams} from "@angular/common/http";
import {Logger, LogService} from "./log.service";
import {Observable, of} from "rxjs";
import {tap} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private api: string = 'api/account';

  private user: User;
  private is_synced: boolean = false;
  private logger: Logger;

  constructor(
    private http: HttpClient,
    private logService: LogService
  ) {
    this.logger = logService.get_logger('AccountService')
  }

  login(name_or_email: string, password: string, remember: boolean): Observable<User> {
    return this.http.post<User>(`${this.api}/login`, {
      name_or_email: name_or_email,
      password: password,
      remember: remember
    }).pipe(
      tap((user: User) => {
        this.user = user;
        this.is_synced = true;
        this.logger.info(`Logged in as ${user.name}`)
      })
    )
  }

  logout(): Observable<any> {
    return this.http.get(`${this.api}/logout`).pipe(
      tap(() => {
        this.user = undefined;
        this.is_synced = true;
        this.logger.info(`Logged out`)
      })
    )
  }

  confirm_email(uid: number, token: string, new_password: string = null, check_only: boolean = false): Observable<any> {
    let api_entry = `${this.api}/confirm-email`;
    let params = new HttpParams().append('uid', uid.toString()).append('token', token);

    if (check_only) {
      return this.http.get(api_entry, {params: params}).pipe(
        tap((user: User) => this.logger.info(`verified email confirmation token for ${user.name}`))
      );
    } else {
      return this.http.post(api_entry, {new_password: new_password}, {params: params}).pipe(
        tap(() => this.logger.info(`confirmed email and set password (uid: ${uid})`))
      )
    }
  }

  request_reconfirm_email(name_or_email: string): Observable<any> {
    return this.http.post(`${this.api}/request-reconfirm-email`, {'name_or_email': name_or_email}).pipe(
      tap(() => this.logger.info(`requested reconfirm email for ${name_or_email}`))
    )
  }

  request_reset_password(name_or_email: string): Observable<any> {
    return this.http.post(`${this.api}/request-reset-password`, {'name_or_email': name_or_email}).pipe(
      tap(() => this.logger.info(`requested reset password for ${name_or_email}`))
    )
  }

  reset_password(uid: number, token: string, new_password: string = null, check_only: boolean = false): Observable<any> {
    let api_entry = `${this.api}/reset-password`;
    let params = new HttpParams().append('uid', uid.toString()).append('token', token);
    if (check_only) {
      return this.http.get(api_entry, {params: params}).pipe(
        tap((user: User) => this.logger.info(`verified password reset token for ${user.name}`))
      )
    } else {
      return this.http.post(api_entry, {new_password: new_password}, {params: params}).pipe(
        tap(() => this.logger.info(`password reset successfully (uid: ${uid})`))
      )
    }
  }

  get_current_user(force_sync: boolean = false): Observable<User> {
    if (this.is_synced && !force_sync) {
      return of(this.user)
    }
    return this.http.get<User>(`${this.api}/whoami`).pipe(
      tap((user: User) => {
        this.user = user;
        this.is_synced = true;
        if (user == null)
          this.logger.info(`Synced: not logged in`);
        else
          this.logger.info(`Synced user ${user.name}`)
      })
    )
  }

  get_me(): Observable<User> {
    return this.http.get<User>(`${this.api}/me`).pipe(
      tap((user) => {
        this.user = user;
        this.is_synced = true;
        this.logger.info(`Synced user ${user.name}`)
      })
    )
  }

  update_my_profile(nickname: string): Observable<User> {
    return this.http.put<User>(`${this.api}/me`, {nickname: nickname}).pipe(
      tap((user: User) => {
        this.user = user;
        this.is_synced = true;
        this.logger.info(`updated profile for user ${user.name}`);
      })
    )
  }

  update_my_avatar(avatar: File): Observable<User> {
    let form = new FormData();
    form.append('avatar', avatar);
    return this.http.put<User>(`${this.api}/me`, form).pipe(
      tap((user: User) => {
        this.user = user;
        this.is_synced = true;
        this.logger.info(`updated avatar for user ${user.name}`);
      })
    )
  }

  update_password(old_password: string, new_password: string): Observable<any> {
    return this.http.put(`${this.api}/me/password`, {old_password: old_password, new_password: new_password}).pipe(
      tap(() => this.logger.info(`updated password for user ${this.user.name}`))
    )
  }

  get_my_clients(): Observable<OAuthClient[]> {
    return this.http.get<OAuthClient[]>(`${this.api}/clients`).pipe(
      tap(clients => this.logger.info(`Fetched ${clients.length} clients`))
    )
  }
}
