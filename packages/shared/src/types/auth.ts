export interface AuthConfig {
  enabled: boolean;
  username?: string;
}

export interface AuthUpdateRequest {
  enabled: boolean;
  username?: string;
  password?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
}
