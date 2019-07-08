import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {DashboardComponent} from "./dashboard/dashboard.component";
import {AccountLoginComponent} from "./account-login/account-login.component";
import {NotFoundComponent} from "./not-found/not-found.component";
import {AuthGuard} from "./auth.guard";
import {AdminComponent} from "./admin/admin.component";
import {LandingComponent} from "./landing/landing.component";
import {AccountLogoutComponent} from "./account-logout/account-logout.component";
import {ForbiddenComponent} from "./forbidden/forbidden.component";
import {AuthAdminGuard} from "./auth-admin.guard";
import {SettingsProfileComponent} from "./settings-profile/settings-profile.component";
import {AccountReqResetPasswordComponent} from "./account-req-reset-password/account-req-reset-password.component";
import {AccountResetPasswordComponent} from "./account-reset-password/account-reset-password.component";
import {AccountConfirmEmailComponent} from "./account-confirm-email/account-confirm-email.component";
import {SettingsComponent} from "./settings/settings.component";
import {SettingsPasswordComponent} from "./settings-password/settings-password.component";
import {AdminAccountUsersComponent} from "./admin-account-users/admin-account-users.component";
import {AdminAccountGroupsComponent} from "./admin-account-groups/admin-account-groups.component";
import {AdminOauthClientsComponent} from "./admin-oauth-clients/admin-oauth-clients.component";
import {AdminAccountUserEditComponent} from "./admin-account-user-edit/admin-account-user-edit.component";
import {AdminAccountUserInviteComponent} from "./admin-account-user-invite/admin-account-user-invite.component";
import {AdminAccountGroupEditComponent} from "./admin-account-group-edit/admin-account-group-edit.component";
import {AdminAccountGroupNewComponent} from "./admin-account-group-new/admin-account-group-new.component";
import {AdminOauthClientEditComponent} from "./admin-oauth-client-edit/admin-oauth-client-edit.component";
import {AdminOauthClientNewComponent} from "./admin-oauth-client-new/admin-oauth-client-new.component";
import {AccountReqReconfirmEmailComponent} from "./account-req-reconfirm-email/account-req-reconfirm-email.component";
import {OauthLoginComponent} from "./oauth-login/oauth-login.component";
import {AdminAccountUsersBatchComponent} from "./admin-account-users-batch/admin-account-users-batch.component";
import {HomeComponent} from "./home/home.component";
import {SettingsTwoFactorComponent} from "./settings-two-factor/settings-two-factor.component";
import {AccountRequestDisableTwoFactorByEmailComponent} from "./account-request-disable-two-factor-by-email/account-request-disable-two-factor-by-email.component";
import {AccountDisableTwoFactorByEmailComponent} from "./account-disable-two-factor-by-email/account-disable-two-factor-by-email.component";

const routes: Routes = [
  {path: '', pathMatch: 'full', canActivate: [AuthGuard], component: HomeComponent},
  {
    path: '',
    component: LandingComponent,
    children: [
      {
        path: 'account',
        children: [
          {path: '', pathMatch: 'full', redirectTo: '/'},
          {path: 'login', component: AccountLoginComponent},
          {path: 'logout', component: AccountLogoutComponent},
          {path: 'request-reset-password', component: AccountReqResetPasswordComponent},
          {path: 'reset-password', component: AccountResetPasswordComponent},
          {path: 'confirm-email', component: AccountConfirmEmailComponent},
          {path: 'request-reconfirm-email', component: AccountReqReconfirmEmailComponent},
          {path: 'disable-two-factor-by-email', component: AccountDisableTwoFactorByEmailComponent},
          {path: 'request-disable-two-factor-by-email', component: AccountRequestDisableTwoFactorByEmailComponent}
        ]
      },
      {
        path: 'oauth',
        children: [
          {path: '', pathMatch: 'full', redirectTo: '/'},
          {path: 'login', component: OauthLoginComponent}
        ]
      }
    ]
  },
  {
    path: '',
    component: DashboardComponent,
    children: [
      {
        path: 'settings',
        component: SettingsComponent,
        canActivate: [AuthGuard],
        children: [
          {path: '', pathMatch: 'full', redirectTo: 'profile'},
          {path: 'profile', component: SettingsProfileComponent},
          {path: 'password', component: SettingsPasswordComponent},
          {path: 'two-factor', component: SettingsTwoFactorComponent}
        ]
      },
      {
        path: 'admin',
        component: AdminComponent,
        canActivate: [AuthAdminGuard],
        children: [
          {path: '', pathMatch: 'full', redirectTo: 'account/users'},
          {
            path: 'account',
            children: [
              {path: '', pathMatch: 'full', redirectTo: 'users'},
              {
                path: 'users',
                children: [
                  {path: '', pathMatch: 'full', component: AdminAccountUsersComponent},
                  {path: 'u/:uid', component: AdminAccountUserEditComponent},
                  {path: 'invite', component: AdminAccountUserInviteComponent},
                  {path: 'batch', component: AdminAccountUsersBatchComponent},
                ]
              },
              {
                path: 'groups',
                children: [
                  {path: '', pathMatch: 'full', component: AdminAccountGroupsComponent},
                  {path: 'g/:gid', component: AdminAccountGroupEditComponent},
                  {path: 'new', component: AdminAccountGroupNewComponent},
                ]
              }
            ]
          },
          {
            path: 'oauth',
            children: [
              {path: '', pathMatch: 'full', redirectTo: 'clients'},
              {
                path: 'clients',
                children: [
                  {path: '', pathMatch: 'full', component: AdminOauthClientsComponent},
                  {path: 'c/:cid', component: AdminOauthClientEditComponent},
                  {path: 'new', component: AdminOauthClientNewComponent}
                ]
              }
            ]
          },
        ]
      },
    ]
  },
  {path: 'forbidden', component: ForbiddenComponent},
  {path: '**', component: NotFoundComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
