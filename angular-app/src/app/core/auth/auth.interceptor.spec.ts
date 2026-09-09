import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStorageKey } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { HttpClient } from '@angular/common/http';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  const navigate = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    navigate.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate } },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  it('adds the bearer token to requests', () => {
    localStorage.setItem(tokenStorageKey, 'secret');
    client.get('/api/activities').subscribe();
    const request = http.expectOne('/api/activities');
    expect(request.request.headers.get('Authorization')).toBe('Bearer secret');
    request.flush({});
  });

  it('clears the session and redirects after a protected 401 response', () => {
    localStorage.setItem(tokenStorageKey, 'secret');
    localStorage.setItem('my-hike-user', '{}');
    client.get('/api/activities').subscribe({ error: () => undefined });
    http.expectOne('/api/activities').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(localStorage.getItem(tokenStorageKey)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
