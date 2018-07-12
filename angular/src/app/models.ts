export class BasicError {
  msg: string;
  detail: string;
}

export class User {
  id: number;
  name: string;
  email: string;
  nickname: string;
  avatar: string;
  is_active: boolean;

  groups: Group[];
}

export class UserAdvanced extends User {
  created_at: string;
  modified_at: string;
  email_confirmed_at: string;
  is_email_confirmed: boolean;
}

export class Group {
  id: number;
  name: string;
  description: string;
}

export class GroupAdvanced extends Group {
  created_at: string;
  modified_at: string;
}


export class LoginRecord {
  id: number;
  user_id: number;
  time: string;
  ip: string;
  user_agent: string;
  success: boolean;
  reason: string;
}

export class OAuthClient {
  id: number;
  name: string;
  secret: string;
  redirect_url: string;
  home_url: string;
  description: string;
  icon: string;
}

export class OAuthClientAdvanced extends OAuthClient {
  created_at: string;
  modified_at: string;
}

export class OAuthClientUser {
  client: OAuthClient;
  user: User;
}

export class OAuthClientUserAdvanced extends OAuthClientUser {
  created_at: string;
  modified_at: string;
}
