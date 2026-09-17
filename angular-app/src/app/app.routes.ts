import type { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guard';

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
    path: 'confirm-email',
    loadComponent: () =>
      import('./features/auth/confirm-email/confirm-email.page').then((m) => m.ConfirmEmailPage),
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
    loadComponent: () =>
      import('./features/friends-dashboard/friends-dashboard.page').then(
        (m) => m.FriendsDashboardPage,
      ),
  },
  {
    path: 'friends/find',
    canActivate: [authGuard],
    loadComponent: () => import('./features/friends/friends.page').then((m) => m.FriendsPage),
  },
  {
    path: 'friends/compare',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/friend-comparison/friend-comparison.page').then(
        (m) => m.FriendComparisonPage,
      ),
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
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/admin/admin.page').then((m) => m.AdminPage),
  },
  {
    path: 'admin/users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin/users/admin-users.page').then((m) => m.AdminUsersPage),
  },
  {
    path: 'admin/users/:id/edit',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin/users/edit/admin-user-edit.page').then((m) => m.AdminUserEditPage),
  },
  {
    path: 'admin/activities',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin/activities/admin-activities.page').then(
        (m) => m.AdminActivitiesPage,
      ),
  },
  {
    path: 'admin/emails',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin/emails/admin-emails.page').then((m) => m.AdminEmailsPage),
  },
  {
    path: 'admin/emails/send-test-email',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin/emails/send-test-email/admin-send-test-email.page').then(
        (m) => m.AdminSendTestEmailPage,
      ),
  },
  { path: '**', redirectTo: '' },
];
