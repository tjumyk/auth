export class BasicError {
  msg: string;
  detail?: string;
}

export class User {
  id: number;
  name: string;
  email: string;
  nickname: string;
  avatar: string;
  is_active: boolean;

  groups?: Group[];
  group_ids?: number[];
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

  users?: User[];
  user_ids?: number[];
  allowed_clients?: OAuthClient[];
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
  is_public: boolean;
  home_url: string;
  description: string;
  icon: string;

  allowed_groups?: Group[];
}

export class OAuthClientAdvanced extends OAuthClient {
  created_at: string;
  modified_at: string;
  secret: string;
  redirect_url: string;
}

export class OAuthAuthorization {
  client_id: number;
  user_id: number;
  created_at: string;
  modified_at: string;

  client?: OAuthClient;
  user?: User;
}
