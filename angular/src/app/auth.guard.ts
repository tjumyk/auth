import {Injectable} from '@angular/core';
import {CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {AccountService} from "./account.service";
import {map} from "rxjs/operators";
import {User} from "./models";

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private accountService: AccountService,
    private router: Router
  ) {
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    return this.accountService.get_current_user().pipe(
      map((user: User) => {
        if (user != null)
          return true;
        this.router.navigate(['/account/login'], {queryParams: {redirect: state.url}, replaceUrl: true});
        return false;
      })
    )
  }
}
