export interface BasicError {
  msg: string;
  detail?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  nickname: string;
  avatar: string;
  is_active: boolean;
  is_two_factor_enabled: boolean;
  external_auth_provider_id?: string;
  external_auth_enforced: boolean;

  groups?: Group[];
  group_ids?: number[];
  authorizations?: OAuthAuthorization[];
}

export interface UserAdvanced extends User {
  created_at: string;
  modified_at: string;
  email_confirmed_at: string;
  is_email_confirmed: boolean;
}

export interface Group {
  id: number;
  name: string;
  description: string;

  users?: User[];
  user_ids?: number[];
  allowed_clients?: OAuthClient[];
}

export interface GroupAdvanced extends Group {
  created_at: string;
  modified_at: string;
}


export interface LoginRecord {
  id: number;
  user_id: number;
  time: string;
  ip: string;
  user_agent: string;
  success: boolean;
  reason: string;

  country?: IPCountryInfo;

  _ua_os_icon?: string;
  _ua_browser_icon?: string;
}

export interface IPCountryInfo {
  name: string;
  iso_code: string;
}

export interface OAuthClient {
  id: number;
  name: string;
  is_public: boolean;
  home_url: string;
  description: string;
  icon: string;

  _is_ip_blocked: boolean;
}

export interface OAuthClientAdvanced extends OAuthClient {
  created_at: string;
  modified_at: string;
  secret: string;
  redirect_url: string;
  allowed_groups: Group[];
}

export interface OAuthAuthorization {
  client_id: number;
  user_id: number;
  created_at: string;
  modified_at: string;

  client?: OAuthClient;
  user?: User;
}

export interface IPInfo{
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  postal_code?: string;
  asn?: number;
  organization?: string;
  hostname?: string;
}

export interface ExternalUserInfoResult{
  id: string;
  name: string;
  type: string;
  result?: any;
  error?: BasicError;
}

export interface TwoFactorSetupInfo{
  qr_code: string;
}

export interface ExternalAuthProvider{
  id: string;
  name: string;
  description?:string;
  update_password_url?: string;
  reset_password_url?: string;
}

export interface SendEmailResponse{
  num_recipients: number;
}

export interface VersionInfo{
  commit: string;
}

export interface IPCheckResult {
  check_pass: boolean;
  guarded_ports: number[];
}
