import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'service-unavailable',
    loadComponent: () =>
      import('./features/service-unavailable/service-unavailable.page').then(
        (m) => m.ServiceUnavailablePage,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'my-activities',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/activities/activities.page').then((m) => m.ActivitiesPage),
  },
  { path: 'activities', redirectTo: 'my-activities', pathMatch: 'full' },
  {
    path: 'friends',
    canActivate: [authGuard],
    loadComponent: () => import('./features/friends/friends.page').then((m) => m.FriendsPage),
  },
  {
    path: 'friends-activities',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/friends-activities/friends-activities.page').then(
        (m) => m.FriendsActivitiesPage,
      ),
  },
  {
    path: 'graphs',
    canActivate: [authGuard],
    loadComponent: () => import('./features/graphs/graphs.page').then((m) => m.GraphsPage),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'my-weight',
    canActivate: [authGuard],
    loadComponent: () => import('./features/my-weight/my-weight.page').then((m) => m.MyWeightPage),
  },
  { path: '**', redirectTo: '' },
];
