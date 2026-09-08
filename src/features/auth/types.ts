export type AuthUser = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  image: string;
};

export type LoginResponse = AuthUser & {
  accessToken: string;
  refreshToken: string;
};
