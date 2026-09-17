import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { AuthResponse } from '../interface/auth-response.interface';
import type { AuthUser } from '../interface/auth-user.interface';
import type { LoginDraft } from '../interface/login-draft.interface';
import type { RegisterDraft } from '../interface/register-draft.interface';
import { environment } from '../../../environments/environment';

const apiUrl = `${environment.apiOrigin}/api/auth`;
export const tokenStorageKey = 'my-hike-access-token';
const userStorageKey = 'my-hike-user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly token = signal<string | null>(localStorage.getItem(tokenStorageKey));
  readonly user = signal<AuthUser | null>(this.readUser());
  readonly isAuthenticated = computed(() => Boolean(this.token()));

  async login(credentials: LoginDraft): Promise<void> {
    this.storeSession(
      await firstValueFrom(this.http.post<AuthResponse>(`${apiUrl}/login`, credentials)),
    );
  }

  async register(details: RegisterDraft): Promise<void> {
    await firstValueFrom(this.http.post(`${apiUrl}/register`, details));
  }

  async confirmEmail(token: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${apiUrl}/confirm-email`, { token }));
  }

  async resendConfirmation(email: string, language: 'en' | 'si'): Promise<void> {
    await firstValueFrom(this.http.post(`${apiUrl}/resend-confirmation`, { email, language }));
  }

  logout(): void {
    localStorage.removeItem(tokenStorageKey);
    localStorage.removeItem(userStorageKey);
    this.token.set(null);
    this.user.set(null);
  }

  updateRegisteredName(name: string): void {
    const user = this.user();
    if (!user) return;
    const updated = { ...user, name };
    localStorage.setItem(userStorageKey, JSON.stringify(updated));
    this.user.set(updated);
  }

  updateAuthenticatedUser(user: AuthUser): void {
    localStorage.setItem(userStorageKey, JSON.stringify(user));
    this.user.set(user);
  }

  private storeSession(response: AuthResponse): void {
    localStorage.setItem(tokenStorageKey, response.token);
    localStorage.setItem(userStorageKey, JSON.stringify(response.user));
    this.user.set(response.user);
    this.token.set(response.token);
  }

  private readUser(): AuthUser | null {
    try {
      const value = localStorage.getItem(userStorageKey);
      return value ? (JSON.parse(value) as AuthUser) : null;
    } catch {
      localStorage.removeItem(userStorageKey);
      return null;
    }
  }
}
