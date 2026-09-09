import { signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { HikeApiService } from './core/api/hike-api.service';
import { AuthService } from './core/auth/auth.service';
import { LogWrapper } from './core/logging/log-wrapper.service';
import { FriendsStore } from './core/stores/friends.store';
import { MockHikeStore } from './core/stores/mock-hike.store';
import { ActivitiesPage } from './features/activities/activities.page';
import { AdminActivitiesPage } from './features/admin/activities/admin-activities.page';
import { AdminPage } from './features/admin/admin.page';
import { AdminUsersPage } from './features/admin/users/admin-users.page';
import { AdminUserEditPage } from './features/admin/users/edit/admin-user-edit.page';
import { LoginPage } from './features/auth/login/login.page';
import { RegisterPage } from './features/auth/register/register.page';
import { FriendComparisonPage } from './features/friend-comparison/friend-comparison.page';
import { FriendsActivitiesPage } from './features/friends-activities/friends-activities.page';
import { FriendsDashboardPage } from './features/friends-dashboard/friends-dashboard.page';
import { FriendsPage } from './features/friends/friends.page';
import { GraphsPage } from './features/graphs/graphs.page';
import { HomePage } from './features/home/home.page';
import { MyWeightPage } from './features/my-weight/my-weight.page';
import { ServiceUnavailablePage } from './features/service-unavailable/service-unavailable.page';
import { SettingsPage } from './features/settings/settings.page';
import { ActivityMonthListComponent } from './shared/ui/activity-month-list/activity-month-list.component';
import { AdminUserActivitiesComponent } from './shared/ui/admin-user-activities/admin-user-activities.component';
import { AdminUserFormComponent } from './shared/ui/admin-user-form/admin-user-form.component';
import { AppHeaderComponent } from './shared/ui/app-header/app-header.component';
import { FriendComparisonChartComponent } from './shared/ui/friend-comparison-chart/friend-comparison-chart.component';
import { HikeFormComponent } from './shared/ui/hike-form/hike-form.component';
import { HikeListComponent } from './shared/ui/hike-list/hike-list.component';
import { ModalDialogComponent } from './shared/ui/modal-dialog/modal-dialog.component';
import { MyWeightComponent } from './shared/ui/my-weight/my-weight.component';
import { PeopleSelectComponent } from './shared/ui/people-select/people-select.component';

interface ComponentCase {
  name: string;
  component: Type<unknown>;
  inputs?: Record<string, unknown>;
}

const componentCases: ComponentCase[] = [
  { name: 'App', component: App },
  { name: 'ActivitiesPage', component: ActivitiesPage },
  { name: 'AdminActivitiesPage', component: AdminActivitiesPage },
  { name: 'AdminPage', component: AdminPage },
  { name: 'AdminUsersPage', component: AdminUsersPage },
  { name: 'AdminUserEditPage', component: AdminUserEditPage },
  { name: 'LoginPage', component: LoginPage },
  { name: 'RegisterPage', component: RegisterPage },
  { name: 'FriendComparisonPage', component: FriendComparisonPage },
  { name: 'FriendsActivitiesPage', component: FriendsActivitiesPage },
  { name: 'FriendsDashboardPage', component: FriendsDashboardPage },
  { name: 'FriendsPage', component: FriendsPage },
  { name: 'GraphsPage', component: GraphsPage },
  { name: 'HomePage', component: HomePage },
  { name: 'MyWeightPage', component: MyWeightPage },
  { name: 'ServiceUnavailablePage', component: ServiceUnavailablePage },
  { name: 'SettingsPage', component: SettingsPage },
  {
    name: 'ActivityMonthListComponent',
    component: ActivityMonthListComponent,
    inputs: { title: 'September', days: [], minutes: 0, metres: 0 },
  },
  {
    name: 'AdminUserActivitiesComponent',
    component: AdminUserActivitiesComponent,
    inputs: { userId: 'user-id' },
  },
  {
    name: 'AdminUserFormComponent',
    component: AdminUserFormComponent,
    inputs: { user: { name: 'User', email: 'user@example.test', role: 'normal_user' } },
  },
  {
    name: 'AppHeaderComponent',
    component: AppHeaderComponent,
    inputs: { appName: 'My Hike', subtitle: 'Test' },
  },
  {
    name: 'FriendComparisonChartComponent',
    component: FriendComparisonChartComponent,
    inputs: { series: [], month: '2026-09' },
  },
  { name: 'HikeFormComponent', component: HikeFormComponent, inputs: { ownerName: 'User' } },
  { name: 'HikeListComponent', component: HikeListComponent, inputs: { hikes: [] } },
  {
    name: 'ModalDialogComponent',
    component: ModalDialogComponent,
    inputs: { title: 'Dialog', closeLabel: 'Close' },
  },
  { name: 'MyWeightComponent', component: MyWeightComponent },
  {
    name: 'PeopleSelectComponent',
    component: PeopleSelectComponent,
    inputs: { ownerName: 'User', suggestions: [], selectedPeople: [] },
  },
];

describe('Angular components', () => {
  beforeEach(() => {
    const settings = signal({ appName: 'My Hike', ownerName: 'User' });
    const friends = signal<never[]>([]);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MockHikeStore,
          useValue: {
            settings,
            hikes: signal([]),
            weights: signal([]),
            loading: signal(false),
            apiOnline: signal(true),
            error: signal(null),
            people: signal(['User']),
            todayHikes: signal([]),
            totalMinutes: signal(0),
            lastActivityType: signal('hiking'),
            lastHikingName: signal(''),
            load: vi.fn().mockResolvedValue(true),
            refreshHikes: vi.fn().mockResolvedValue(undefined),
            addMockHike: vi.fn().mockResolvedValue(undefined),
            updateHike: vi.fn().mockResolvedValue(undefined),
            removeMockHike: vi.fn().mockResolvedValue(undefined),
            saveSettings: vi.fn().mockResolvedValue(undefined),
            addWeight: vi.fn().mockResolvedValue(undefined),
            updateWeight: vi.fn().mockResolvedValue(undefined),
            removeWeight: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: FriendsStore,
          useValue: {
            friends,
            activities: signal([]),
            requests: signal([]),
            incomingRequests: signal([]),
            outgoingRequests: signal([]),
            searchResults: signal([]),
            searching: signal(false),
            loading: signal(false),
            error: signal(''),
            load: vi.fn().mockResolvedValue(undefined),
            loadHeaderData: vi.fn().mockResolvedValue(undefined),
            searchUsers: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuthService,
          useValue: {
            user: signal(null),
            isAuthenticated: signal(false),
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
          },
        },
        {
          provide: HikeApiService,
          useValue: {
            loadAdminUsers: vi.fn().mockResolvedValue({
              items: [],
              page: 1,
              pageSize: 10,
              total: 0,
              totalPages: 1,
            }),
            loadAdminUser: vi.fn().mockResolvedValue(null),
            loadAdminUserActivities: vi.fn().mockResolvedValue({
              items: [],
              page: 1,
              pageSize: 10,
              total: 0,
              totalPages: 1,
            }),
            loadFriendComparison: vi.fn().mockResolvedValue([]),
            changePassword: vi.fn().mockResolvedValue(undefined),
          },
        },
        { provide: LogWrapper, useValue: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
        {
          provide: TranslocoService,
          useValue: {
            langChanges$: of('en'),
            getActiveLang: () => 'en',
            setActiveLang: vi.fn(),
            translate: (key: string) => key,
          },
        },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => 'user-id' },
              queryParamMap: { get: () => null },
            },
          },
        },
      ],
    });
  });

  for (const testCase of componentCases) {
    it(`creates ${testCase.name}`, async () => {
      TestBed.overrideComponent(testCase.component, { set: { template: '' } });
      await TestBed.compileComponents();
      const fixture = TestBed.createComponent(testCase.component);
      for (const [name, value] of Object.entries(testCase.inputs ?? {})) {
        fixture.componentRef.setInput(name, value);
      }
      fixture.detectChanges();
      expect(fixture.componentInstance).toBeTruthy();
    });
  }
});
