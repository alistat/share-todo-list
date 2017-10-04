export interface User {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  emailVerified: boolean;
  trueEmailVerified: boolean;
  providerId: string;
  isAdmin: boolean;
  providerData: any[];

  getToken(forceRefresh: boolean): Promise<string>;
  updatePassword(newPassword: boolean): Promise<void>;
  updateProfile(profile: any): Promise<void>;
  sendEmailVerification(): Promise<void>;
  delete(): Promise<void>;
  reload(): Promise<void>;
}
