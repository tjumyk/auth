import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {AccountLoginComponent} from './account-login/account-login.component';
import {HttpClientModule} from "@angular/common/http";
import {NotFoundComponent} from './not-found/not-found.component';
import {FormsModule} from "@angular/forms";
import {LandingComponent} from './landing/landing.component';
import {AccountLogoutComponent} from './account-logout/account-logout.component';
import {ForbiddenComponent} from './forbidden/forbidden.component';
import {AccountReqResetPasswordComponent} from './account-req-reset-password/account-req-reset-password.component';
import {SettingsProfileComponent} from './settings-profile/settings-profile.component';
import {AccountResetPasswordComponent} from './account-reset-password/account-reset-password.component';
import {OauthLoginComponent} from './oauth-login/oauth-login.component';
import {SettingsComponent} from './settings/settings.component';
import {AdminComponent} from './admin/admin.component';
import {AccountConfirmEmailComponent} from './account-confirm-email/account-confirm-email.component';
import {SettingsPasswordComponent} from './settings-password/settings-password.component';
import {AdminAccountUsersComponent} from './admin-account-users/admin-account-users.component';
import {AdminAccountGroupsComponent} from './admin-account-groups/admin-account-groups.component';
import {AdminOauthClientsComponent} from "./admin-oauth-clients/admin-oauth-clients.component";
import { AdminAccountUserEditComponent } from './admin-account-user-edit/admin-account-user-edit.component';
import { AdminAccountUserInviteComponent } from './admin-account-user-invite/admin-account-user-invite.component';
import { AdminOauthClientEditComponent } from './admin-oauth-client-edit/admin-oauth-client-edit.component';
import { AdminOauthClientNewComponent } from './admin-oauth-client-new/admin-oauth-client-new.component';
import { AdminAccountGroupEditComponent } from './admin-account-group-edit/admin-account-group-edit.component';
import { AdminAccountGroupNewComponent } from './admin-account-group-new/admin-account-group-new.component';
import { SameAsDirective } from './same-as.directive';
import { AccountReqReconfirmEmailComponent } from './account-req-reconfirm-email/account-req-reconfirm-email.component';
import { StrongPasswordDirective } from './strong-password.directive';
import { AdminAccountUsersBatchComponent } from './admin-account-users-batch/admin-account-users-batch.component';
import { HomeComponent } from './home/home.component';
import { SettingsTwoFactorComponent } from './settings-two-factor/settings-two-factor.component';
import { TwoFactorLoginBoxComponent } from './two-factor-login-box/two-factor-login-box.component';
import { AccountRequestDisableTwoFactorByEmailComponent } from './account-request-disable-two-factor-by-email/account-request-disable-two-factor-by-email.component';
import { AccountDisableTwoFactorByEmailComponent } from './account-disable-two-factor-by-email/account-disable-two-factor-by-email.component';
import { AdminEmailSendComponent } from './admin-email-send/admin-email-send.component';
import { AdminAboutComponent } from './admin-about/admin-about.component';
import {AccountRegisterComponent} from "./account-register/account-register.component";

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    AccountLoginComponent,
    NotFoundComponent,
    LandingComponent,
    AccountLogoutComponent,
    ForbiddenComponent,
    AccountReqResetPasswordComponent,
    SettingsProfileComponent,
    AccountResetPasswordComponent,
    OauthLoginComponent,
    SettingsComponent,
    AdminComponent,
    AccountConfirmEmailComponent,
    SettingsPasswordComponent,
    AdminAccountUsersComponent,
    AdminOauthClientsComponent,
    AdminAccountGroupsComponent,
    AdminAccountUserEditComponent,
    AdminAccountUserInviteComponent,
    AdminOauthClientEditComponent,
    AdminOauthClientNewComponent,
    AdminAccountGroupEditComponent,
    AdminAccountGroupNewComponent,
    SameAsDirective,
    AccountReqReconfirmEmailComponent,
    StrongPasswordDirective,
    AdminAccountUsersBatchComponent,
    HomeComponent,
    SettingsTwoFactorComponent,
    TwoFactorLoginBoxComponent,
    AccountRequestDisableTwoFactorByEmailComponent,
    AccountDisableTwoFactorByEmailComponent,
    AdminEmailSendComponent,
    AdminAboutComponent,
    AccountRegisterComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
