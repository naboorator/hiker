import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmEmailPage } from './confirm-email.page';

describe('ConfirmEmailPage', () => {
  const confirmEmail = vi.fn();

  beforeEach(() => confirmEmail.mockReset());

  async function create(token: string | null): Promise<ConfirmEmailPage> {
    await TestBed.configureTestingModule({
      imports: [ConfirmEmailPage],
      providers: [
        { provide: AuthService, useValue: { confirmEmail } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => token } } },
        },
      ],
    })
      .overrideComponent(ConfirmEmailPage, { set: { template: '' } })
      .compileComponents();
    const page = TestBed.createComponent(ConfirmEmailPage).componentInstance;
    await Promise.resolve();
    await Promise.resolve();
    return page;
  }

  it('confirms the token and exposes the successful state', async () => {
    confirmEmail.mockResolvedValue(undefined);
    const page = await create('confirmation-token');
    expect(confirmEmail).toHaveBeenCalledWith('confirmation-token');
    expect(page.status()).toBe('confirmed');
  });

  it('rejects a missing token without calling the API', async () => {
    const page = await create(null);
    expect(confirmEmail).not.toHaveBeenCalled();
    expect(page.status()).toBe('invalid');
  });
});
