import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {OAuthClient} from "./models";
import {Observable} from "rxjs/internal/Observable";
import {Logger, LogService} from "./log.service";
import {tap} from "rxjs/operators";

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

  get_clients(): Observable<OAuthClient[]> {
    return this.http.get<OAuthClient[]>(this.api + '/clients').pipe(
      tap((clients: OAuthClient[]) => {
        this.logger.info(`Fetched clients: ${clients.length}`)
      })
    )
  }

  add_client(client: OAuthClient): Observable<OAuthClient> {
    return this.http.post<OAuthClient>(this.api + '/clients', client).pipe(
      tap((client: OAuthClient) => {
        this.logger.info(`Created client: ${client.name}`)
      })
    )
  }
}
