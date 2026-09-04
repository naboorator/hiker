import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { tokenStorageKey } from './auth.service';

export const authGuard: CanActivateFn = () => {
  return localStorage.getItem(tokenStorageKey) ? true : inject(Router).createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  return localStorage.getItem(tokenStorageKey) ? inject(Router).createUrlTree(['/']) : true;
};
