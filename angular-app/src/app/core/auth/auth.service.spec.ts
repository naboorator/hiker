import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService, tokenStorageKey } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  it('logs in and persists the session', async () => {
    const login = service.login({ email: 'user@example.test', password: 'Password1!' });
    const request = http.expectOne('http://localhost:3000/api/auth/login');
    expect(request.request.method).toBe('POST');
    request.flush({
      token: 'jwt-token',
      user: { id: 'user-id', name: 'User', email: 'user@example.test', role: 'normal_user' },
    });
    await login;

    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.name).toBe('User');
    expect(localStorage.getItem(tokenStorageKey)).toBe('jwt-token');
  });

  it('registers and logs out', async () => {
    const registration = service.register({
      name: 'User',
      email: 'user@example.test',
      password: 'Password1!',
      repeatPassword: 'Password1!',
    });
    http.expectOne('http://localhost:3000/api/auth/register').flush({});
    await registration;
    localStorage.setItem(tokenStorageKey, 'token');
    service.logout();
    expect(service.user()).toBeNull();
    expect(localStorage.getItem(tokenStorageKey)).toBeNull();
  });

  it('confirms an email and requests a replacement confirmation', async () => {
    const confirmation = service.confirmEmail('confirmation-token');
    const confirmRequest = http.expectOne('http://localhost:3000/api/auth/confirm-email');
    expect(confirmRequest.request.method).toBe('POST');
    expect(confirmRequest.request.body).toEqual({ token: 'confirmation-token' });
    confirmRequest.flush(null);
    await confirmation;

    const resend = service.resendConfirmation('user@example.test', 'en');
    const resendRequest = http.expectOne('http://localhost:3000/api/auth/resend-confirmation');
    expect(resendRequest.request.body).toEqual({ email: 'user@example.test', language: 'en' });
    resendRequest.flush({});
    await resend;
  });
});
