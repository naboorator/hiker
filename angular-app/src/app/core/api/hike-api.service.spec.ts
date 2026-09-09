import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { IndexedDbClient } from '../data/indexeddb/indexed-db.client';
import { LogWrapper } from '../logging/log-wrapper.service';
import { HikeApiService } from './hike-api.service';

describe('HikeApiService', () => {
  let service: HikeApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: IndexedDbClient, useValue: {} },
        { provide: LogWrapper, useValue: { error: vi.fn() } },
        { provide: AuthService, useValue: { user: signal(null) } },
      ],
    });
    service = TestBed.inject(HikeApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('checks API health', async () => {
    const result = service.checkHealth();
    http.expectOne('http://localhost:3000/health').flush({ status: 'ok' });
    await expect(result).resolves.toBe(true);
  });

  it('loads activities from the API', async () => {
    const result = service.loadHikes();
    await Promise.resolve();
    const request = http.expectOne('http://localhost:3000/api/activities');
    expect(request.request.method).toBe('GET');
    request.flush([]);
    await expect(result).resolves.toEqual([]);
  });

  it('sends password changes to the account endpoint', async () => {
    const result = service.changePassword({
      currentPassword: 'Current123!',
      newPassword: 'Changed123!',
      repeatPassword: 'Changed123!',
    });
    await Promise.resolve();
    const request = http.expectOne('http://localhost:3000/api/account/password');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.newPassword).toBe('Changed123!');
    request.flush(null);
    await result;
  });

  it('exports the current backup', async () => {
    const result = service.exportData();
    await Promise.resolve();
    const request = http.expectOne('http://localhost:3000/api/backup');
    request.flush({ version: 2, exportedAt: '', settings: null, activities: [], weights: [] });
    expect((await result).version).toBe(2);
  });
});
