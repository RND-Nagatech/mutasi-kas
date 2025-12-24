const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const storage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  getUser<T>(): T | null {
    const user = localStorage.getItem(USER_KEY);
    if (!user) return null;
    try {
      return JSON.parse(user) as T;
    } catch {
      return null;
    }
  },

  setUser<T>(user: T): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  },

  clear(): void {
    this.removeToken();
    this.removeUser();
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
