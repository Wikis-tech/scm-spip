import './types';

declare module './types' {
  interface UserProfile {
    permissionLevel?: 'SUPER_ADMIN' | 'HOD_ADMIN' | 'STAFF';
  }
}
