import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LogWrapper } from './log-wrapper.service';

describe('LogWrapper', () => {
  afterEach(() => vi.restoreAllMocks());

  it('forwards every log level to the console', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = TestBed.inject(LogWrapper);

    service.info('info', { id: 1 });
    service.warn('warn');
    service.error('error', new Error('failure'));

    expect(info).toHaveBeenCalledWith('info', { id: 1 });
    expect(warn).toHaveBeenCalledWith('warn', '');
    expect(error).toHaveBeenCalledWith('error', expect.any(Error));
  });
});
