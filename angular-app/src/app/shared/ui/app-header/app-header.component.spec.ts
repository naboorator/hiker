import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { FriendsStore } from '../../../core/stores/friends.store';
import { MockHikeStore } from '../../../core/stores/mock-hike.store';
import { AppHeaderComponent } from './app-header.component';

describe('AppHeaderComponent language selection', () => {
  it('does not render a language switcher in the header', async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppHeaderComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, si: {} },
          translocoConfig: { availableLangs: ['en', 'si'], defaultLang: 'en' },
        }),
      ],
      providers: [
        provideRouter([]),
        { provide: MockHikeStore, useValue: { todayHikes: signal([]), reset: vi.fn() } },
        {
          provide: FriendsStore,
          useValue: {
            incomingRequests: signal([]),
            friends: signal([]),
            loadHeaderData: vi.fn(),
            reset: vi.fn(),
          },
        },
        { provide: AuthService, useValue: { user: signal(null), logout: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppHeaderComponent);
    fixture.componentRef.setInput('appName', 'My Hike');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-language-switcher')).toBeNull();
  });
});
