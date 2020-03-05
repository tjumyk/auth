import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {VersionInfo} from "./models";

@Injectable({
  providedIn: 'root'
})
export class MetaService {
  private api = 'api/meta';

  constructor(
    private http: HttpClient
  ) { }

  getVersion():Observable<VersionInfo>{
    return this.http.get<VersionInfo>(`${this.api}/version`)
  }
}
