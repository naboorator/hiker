import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LogWrapper {
  info(message: string, context?: unknown): void {
    console.info(message, context ?? '');
  }

  warn(message: string, context?: unknown): void {
    console.warn(message, context ?? '');
  }

  error(message: string, error?: unknown): void {
    console.error(message, error ?? '');
  }
}
