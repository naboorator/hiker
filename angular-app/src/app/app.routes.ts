import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage) },
  {
    path: 'activities',
    loadComponent: () =>
      import('./features/activities/activities.page').then((m) => m.ActivitiesPage),
  },
  {
    path: 'graphs',
    loadComponent: () => import('./features/graphs/graphs.page').then((m) => m.GraphsPage),
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'meals',
    loadComponent: () => import('./features/meals/meals.page').then((m) => m.MealsPage),
  },
  {
    path: 'my-weight',
    loadComponent: () => import('./features/my-weight/my-weight.page').then((m) => m.MyWeightPage),
  },
  { path: '**', redirectTo: '' },
];
