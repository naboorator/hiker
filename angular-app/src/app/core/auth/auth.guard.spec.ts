import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, tokenStorageKey } from './auth.service';
import { adminGuard, authGuard, guestGuard } from './auth.guard';

describe('authentication guards', () => {
  const createUrlTree = vi.fn((commands: string[]) => ({ commands }));
  const user = signal<{ role: string } | null>(null);

  beforeEach(() => {
    localStorage.clear();
    user.set(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { createUrlTree } },
        { provide: AuthService, useValue: { user } },
      ],
    });
  });

  it('protects authenticated and guest-only routes', () => {
    expect(TestBed.runInInjectionContext(() => authGuard({} as never, {} as never))).toEqual({
      commands: ['/login'],
    });
    localStorage.setItem(tokenStorageKey, 'token');
    expect(TestBed.runInInjectionContext(() => authGuard({} as never, {} as never))).toBe(true);
    expect(TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never))).toEqual({
      commands: ['/'],
    });
  });

  it('allows only administrators', () => {
    expect(TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never))).toEqual({
      commands: ['/'],
    });
    user.set({ role: 'admin' });
    expect(TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never))).toBe(true);
  });
});
