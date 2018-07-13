import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {Observable} from "rxjs/internal/Observable";
import {Logger, LogService} from "./log.service";
import {tap} from "rxjs/operators";
import {OAuthClient} from "./models";

export class OAuthConnectResult {
  token: string;
  redirect_url: string;
}

@Injectable({
  providedIn: 'root'
})
export class OauthService {
  private api: string = 'api/oauth';
  private logger: Logger;

  constructor(
    private http: HttpClient,
    private logService: LogService
  ) {
    this.logger = logService.get_logger('OAuthService')
  }

  connect(client_id: number, redirect_url: string, state?: string): Observable<OAuthConnectResult> {
    let params = new HttpParams()
      .append('client_id', client_id.toString())
      .append('redirect_url', redirect_url);
    if (!state)
      params = params.append('state', state);
    return this.http.get<OAuthConnectResult>(`${this.api}/connect`, {params: params}).pipe(
      tap(() => this.logger.info(`Obtained authorization token`))
    )
  }

  get_client(cid: number): Observable<OAuthClient> {
    return this.http.get<OAuthClient>(`${this.api}/clients/${cid}`).pipe(
      tap((client) => this.logger.info(`Fetched profile of OAuth client ${client.name}`))
    )
  }
}
