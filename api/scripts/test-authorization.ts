import { database } from "../core/database.js";

const apiUrl = process.env["API_URL"] ?? "http://127.0.0.1:3100";
const password = "Authorization123!";
const changedPassword = "Authorization456!";
const testEmails = [
  "authz.owner@example.test",
  "authz.other@example.test",
  "authz.admin@example.test",
] as const;

interface AuthResponse {
  token: string;
  user: { id: string };
}

interface TestResult {
  test: string;
  expected: number;
  actual: number;
  passed: boolean;
}

interface AdminUserPage {
  items: { id: string; createdAt: string }[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const results: TestResult[] = [];
let ownerUserId = "";
let otherUserId = "";
let adminUserId = "";

async function request(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${apiUrl}${path}`, options);
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function authorization(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function record(test: string, expected: number, actual: number): void {
  results.push({ test, expected, actual, passed: expected === actual });
}

async function register(name: string, email: string): Promise<void> {
  const response = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, repeatPassword: password }),
  });
  record(`register ${name}`, 201, response.status);
}

async function login(
  email: string,
  loginPassword = password,
): Promise<Response> {
  return request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: loginPassword }),
  });
}

try {
  await database.query(
    "DELETE FROM users WHERE email LIKE 'authz.%@example.test'",
  );
  await register("Authorization Owner", testEmails[0]);
  await register("Authorization Other", testEmails[1]);
  await register("Authorization Admin", testEmails[2]);

  const unconfirmedLogin = await login(testEmails[0]);
  record(
    "login rejects an unconfirmed email address",
    403,
    unconfirmedLogin.status,
  );
  const unconfirmedError = await json<{ code?: string }>(unconfirmedLogin);
  record(
    "unconfirmed login returns its machine-readable error code",
    1,
    Number(unconfirmedError.code === "EMAIL_NOT_CONFIRMED"),
  );

  await database.query(
    `UPDATE users
        SET email_confirmed = 1, email_confirmed_at = NOW(),
            role = IF(email = ?, 'admin', role)
      WHERE email IN (?, ?, ?)`,
    [testEmails[2], ...testEmails],
  );

  const missingToken = await request("/api/activities");
  record("protected endpoint rejects missing token", 401, missingToken.status);
  const wrongPassword = await login(testEmails[0], "incorrect-password");
  record("login rejects incorrect password", 401, wrongPassword.status);

  const ownerLogin = await login(testEmails[0]);
  const otherLogin = await login(testEmails[1]);
  const adminLogin = await login(testEmails[2]);
  record("owner login", 200, ownerLogin.status);
  record("other user login", 200, otherLogin.status);
  record("administrator login", 200, adminLogin.status);
  const owner = await json<AuthResponse>(ownerLogin);
  const other = await json<AuthResponse>(otherLogin);
  const admin = await json<AuthResponse>(adminLogin);
  ownerUserId = owner.user.id;
  otherUserId = other.user.id;
  adminUserId = admin.user.id;

  const nonAdminTestEmail = await request("/api/admin/emails/send-test-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authorization(owner.token),
    },
    body: JSON.stringify({
      email: "recipient@example.test",
      subject: "Authorization test",
      body: "This message must not be sent.",
    }),
  });
  record(
    "non-administrator cannot send test email",
    403,
    nonAdminTestEmail.status,
  );

  const incorrectCurrentPassword = await request("/api/account/password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authorization(owner.token),
    },
    body: JSON.stringify({
      currentPassword: "Incorrect123!",
      newPassword: changedPassword,
      repeatPassword: changedPassword,
    }),
  });
  record(
    "password change rejects incorrect current password",
    400,
    incorrectCurrentPassword.status,
  );
  const mismatchedNewPassword = await request("/api/account/password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authorization(owner.token),
    },
    body: JSON.stringify({
      currentPassword: password,
      newPassword: changedPassword,
      repeatPassword: "Different456!",
    }),
  });
  record(
    "password change rejects mismatched new passwords",
    400,
    mismatchedNewPassword.status,
  );
  const changePassword = await request("/api/account/password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authorization(owner.token),
    },
    body: JSON.stringify({
      currentPassword: password,
      newPassword: changedPassword,
      repeatPassword: changedPassword,
    }),
  });
  record("authenticated user changes password", 204, changePassword.status);
  const oldPasswordLogin = await login(testEmails[0]);
  record("old password no longer works", 401, oldPasswordLogin.status);
  const changedPasswordLogin = await login(testEmails[0], changedPassword);
  record("new password works", 200, changedPasswordLogin.status);

  const friendSearchResponse = await request(
    "/api/friends/search?search=Authorization%20Other",
    {
      headers: authorization(owner.token),
    },
  );
  record(
    "user searches potential friends by name",
    200,
    friendSearchResponse.status,
  );
  const friendSearch =
    await json<{ id: string; email: string; connectionStatus: string }[]>(
      friendSearchResponse,
    );
  record(
    "friend search returns expected user",
    1,
    Number(
      friendSearch.some(
        (user) => user.id === other.user.id && user.connectionStatus === "none",
      ),
    ),
  );
  const exactEmailSearchResponse = await request(
    "/api/friends/search?search=authz.other%40example.test",
    { headers: authorization(owner.token) },
  );
  const exactEmailSearch = await json<{ id: string }[]>(
    exactEmailSearchResponse,
  );
  record(
    "friend search matches complete email address",
    1,
    Number(exactEmailSearch.some((user) => user.id === other.user.id)),
  );
  const partialEmailSearchResponse = await request(
    "/api/friends/search?search=authz.other%40",
    {
      headers: authorization(owner.token),
    },
  );
  const partialEmailSearch = await json<{ id: string }[]>(
    partialEmailSearchResponse,
  );
  record(
    "friend search rejects partial email address",
    0,
    partialEmailSearch.length,
  );
  const selfSearchResponse = await request(
    "/api/friends/search?search=authz.owner%40example.test",
    {
      headers: authorization(owner.token),
    },
  );
  const selfSearch = await json<{ id: string }[]>(selfSearchResponse);
  record("friend search excludes current user", 0, selfSearch.length);
  const comparisonRequestResponse = await request("/api/friends", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authorization(owner.token),
    },
    body: JSON.stringify({ email: testEmails[1] }),
  });
  const comparisonRequest = await json<{ id: string }>(
    comparisonRequestResponse,
  );
  record(
    "owner sends comparison friend request",
    201,
    comparisonRequestResponse.status,
  );
  const comparisonAcceptResponse = await request(
    `/api/friends/requests/${comparisonRequest.id}/accept`,
    { method: "PUT", headers: authorization(other.token) },
  );
  record(
    "other user accepts comparison friend request",
    200,
    comparisonAcceptResponse.status,
  );
  const comparisonResponse = await request(
    `/api/friends/comparison?friendIds=${other.user.id}`,
    { headers: authorization(owner.token) },
  );
  record(
    "user compares daily activity for a month with accepted friend",
    200,
    comparisonResponse.status,
  );
  const comparison = await json<
    {
      userId: string;
      isCurrentUser: boolean;
      days: { date: string; activityCount: number }[];
    }[]
  >(comparisonResponse);
  record("comparison contains current user and friend", 2, comparison.length);
  record(
    "comparison identifies current user",
    1,
    Number(
      comparison.some(
        (series) => series.userId === owner.user.id && series.isCurrentUser,
      ),
    ),
  );
  record(
    "comparison returns daily data collections",
    1,
    Number(comparison.every((series) => Array.isArray(series.days))),
  );
  const nonFriendComparison = await request(
    `/api/friends/comparison?friendIds=${admin.user.id}`,
    { headers: authorization(owner.token) },
  );
  record(
    "user cannot compare with a non-friend",
    403,
    nonFriendComparison.status,
  );

  const regularUserAdminPage = await request(
    "/api/admin/users?page=1&pageSize=10",
    {
      headers: authorization(other.token),
    },
  );
  record(
    "regular user cannot access administrator users",
    403,
    regularUserAdminPage.status,
  );
  const administratorUsersResponse = await request(
    "/api/admin/users?page=1&pageSize=10",
    {
      headers: authorization(admin.token),
    },
  );
  record(
    "administrator accesses paginated users",
    200,
    administratorUsersResponse.status,
  );
  const administratorUsers = await json<AdminUserPage>(
    administratorUsersResponse,
  );
  record(
    "administrator user page contains ten records",
    10,
    administratorUsers.items.length,
  );
  record(
    "administrator user page reports page size",
    10,
    administratorUsers.pageSize,
  );
  const sortedNewestFirst = administratorUsers.items.every(
    (user, index, items) =>
      index === 0 || items[index - 1]!.createdAt >= user.createdAt,
  );
  record("administrator users are newest first", 1, Number(sortedNewestFirst));
  const searchedUsersResponse = await request(
    "/api/admin/users?page=1&pageSize=10&search=authz.owner%40example.test",
    { headers: authorization(admin.token) },
  );
  record(
    "administrator searches users by email",
    200,
    searchedUsersResponse.status,
  );
  const searchedUsers = await json<AdminUserPage>(searchedUsersResponse);
  record("user search returns matching user", 1, searchedUsers.total);
  record(
    "user search result has expected id",
    1,
    Number(searchedUsers.items[0]?.id === owner.user.id),
  );
  const emptySearchResponse = await request(
    "/api/admin/users?page=1&pageSize=10&search=no-such-user-search-value",
    { headers: authorization(admin.token) },
  );
  const emptySearch = await json<AdminUserPage>(emptySearchResponse);
  record("user search can return no results", 0, emptySearch.total);

  const regularUserReadsUser = await request(
    `/api/admin/users/${owner.user.id}`,
    {
      headers: authorization(other.token),
    },
  );
  record(
    "regular user cannot read administrator user detail",
    403,
    regularUserReadsUser.status,
  );
  const administratorReadsUser = await request(
    `/api/admin/users/${owner.user.id}`,
    {
      headers: authorization(admin.token),
    },
  );
  record("administrator reads user detail", 200, administratorReadsUser.status);
  const regularUserUpdatesUser = await request(
    `/api/admin/users/${owner.user.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authorization(other.token),
      },
      body: JSON.stringify({
        name: "Unauthorized name",
        email: testEmails[0],
        role: "admin",
      }),
    },
  );
  record(
    "regular user cannot edit another user",
    403,
    regularUserUpdatesUser.status,
  );
  const administratorUpdatesUser = await request(
    `/api/admin/users/${owner.user.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authorization(admin.token),
      },
      body: JSON.stringify({
        name: "Authorization Owner Updated",
        email: "authz.owner.updated@example.test",
        role: "normal_user",
      }),
    },
  );
  record(
    "administrator edits another user",
    200,
    administratorUpdatesUser.status,
  );
  const duplicateEmailUpdate = await request(
    `/api/admin/users/${owner.user.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authorization(admin.token),
      },
      body: JSON.stringify({
        name: "Authorization Owner Updated",
        email: testEmails[1],
        role: "normal_user",
      }),
    },
  );
  record(
    "administrator edit rejects duplicate email",
    409,
    duplicateEmailUpdate.status,
  );
  await database.query(
    "UPDATE users SET email_confirmed = 1, email_confirmed_at = NOW() WHERE id = ?",
    [owner.user.id],
  );

  const blockOther = await request(`/api/admin/users/${other.user.id}/block`, {
    method: "PUT",
    headers: authorization(admin.token),
  });
  record("administrator blocks user", 200, blockOther.status);
  const blockedLogin = await login(testEmails[1]);
  record("blocked user cannot log in", 403, blockedLogin.status);
  const blockedExistingToken = await request("/api/activities", {
    headers: authorization(other.token),
  });
  record(
    "blocked user existing token is rejected",
    403,
    blockedExistingToken.status,
  );
  const unblockOther = await request(
    `/api/admin/users/${other.user.id}/unblock`,
    {
      method: "PUT",
      headers: authorization(admin.token),
    },
  );
  record("administrator unblocks user", 200, unblockOther.status);
  const unblockedLogin = await login(testEmails[1]);
  record("unblocked user can log in", 200, unblockedLogin.status);

  const activityResponse = await request("/api/activities", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authorization(owner.token),
    },
    body: JSON.stringify({
      activityType: "hiking",
      name: "Authorization test activity",
      date: "2026-09-07",
      minutes: 30,
      metres: 1000,
      people: ["Authorization Owner"],
      gpsLocations: [
        {
          latitude: 46.0569,
          longitude: 14.5058,
          accuracy: 10,
          recordedAt: "2026-09-07T10:00:00.000Z",
          segment: 0,
        },
        {
          latitude: 46.057,
          longitude: 14.506,
          accuracy: 9,
          recordedAt: "2026-09-07T10:00:05.000Z",
          segment: 0,
        },
      ],
    }),
  });
  record("owner creates activity", 201, activityResponse.status);
  const activity = await json<{ id: string; hasGpsLocations: boolean }>(
    activityResponse,
  );
  record(
    "created activity is marked as GPS tracked",
    1,
    Number(activity.hasGpsLocations),
  );
  const activityListResponse = await request("/api/activities", {
    headers: authorization(owner.token),
  });
  const activityList =
    await json<{ id: string; hasGpsLocations: boolean }[]>(
      activityListResponse,
    );
  record(
    "activity list exposes the GPS route flag",
    1,
    Number(
      activityList.some(
        (item) => item.id === activity.id && item.hasGpsLocations === true,
      ),
    ),
  );
  const friendActivityDetailResponse = await request(
    `/api/activities/${activity.id}`,
    {
      headers: authorization(other.token),
    },
  );
  record(
    "accepted friend can read activity details",
    200,
    friendActivityDetailResponse.status,
  );
  const routeResponse = await request(
    `/api/activities/${activity.id}/locations`,
    { headers: authorization(owner.token) },
  );
  record("owner reads the stored GPS route", 200, routeResponse.status);
  const route =
    await json<{ sequence: number; segment: number }[]>(routeResponse);
  record("GPS route preserves both ordered samples", 2, route.length);
  record(
    "GPS route preserves sequence and segment",
    1,
    Number(route[1]?.sequence === 1 && route[1].segment === 0),
  );
  const otherRouteResponse = await request(
    `/api/activities/${activity.id}/locations`,
    { headers: authorization(other.token) },
  );
  record(
    "other user cannot read an owned GPS route",
    404,
    otherRouteResponse.status,
  );

  const weightResponse = await request("/api/weights", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authorization(owner.token),
    },
    body: JSON.stringify({ weightKg: 80, recordedOn: "2026-09-07" }),
  });
  record("owner creates weight", 201, weightResponse.status);
  const weight = await json<{ id: string }>(weightResponse);

  const backupResponse = await request("/api/backup", {
    headers: authorization(owner.token),
  });
  record(
    "owner exports data through backup endpoint",
    200,
    backupResponse.status,
  );
  if (!backupResponse.ok)
    throw new Error(
      `Backup endpoint returned ${backupResponse.status}: ${await backupResponse.text()}`,
    );
  const backup = await json<{
    version: number;
    activities: { id: string }[];
    weights: { id: string }[];
  }>(backupResponse);
  record("backup uses current format version", 2, backup.version);
  record(
    "backup contains owner activity",
    1,
    Number(backup.activities.some((item) => item.id === activity.id)),
  );
  record(
    "backup contains owner weight",
    1,
    Number(backup.weights.some((item) => item.id === weight.id)),
  );
  const duplicateImportResponse = await request("/api/backup/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authorization(owner.token),
    },
    body: JSON.stringify(backup),
  });
  record(
    "owner imports backup through API",
    200,
    duplicateImportResponse.status,
  );
  const duplicateImport = await json<{
    skippedActivities: number;
    skippedWeights: number;
  }>(duplicateImportResponse);
  record(
    "backup import skips existing activity",
    1,
    Number(duplicateImport.skippedActivities > 0),
  );
  record(
    "backup import skips existing weight",
    1,
    Number(duplicateImport.skippedWeights > 0),
  );
  const oldVersionImportResponse = await request("/api/backup/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authorization(owner.token),
    },
    body: JSON.stringify({
      version: 1,
      hikes: [
        {
          name: "Old backup activity",
          date: "2026-08-01",
          minutes: 35,
          distance: 1200,
          people: ["Authorization Owner"],
        },
      ],
    }),
  });
  record(
    "old backup versions are rejected",
    400,
    oldVersionImportResponse.status,
  );
  const invalidImport = await request("/api/backup/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authorization(owner.token),
    },
    body: JSON.stringify({ invalid: true }),
  });
  record("invalid backup is rejected", 400, invalidImport.status);

  const otherDeletesActivity = await request(`/api/activities/${activity.id}`, {
    method: "DELETE",
    headers: authorization(other.token),
  });
  record(
    "other user cannot delete owner's activity",
    404,
    otherDeletesActivity.status,
  );
  const otherUpdatesWeight = await request(`/api/weights/${weight.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authorization(other.token),
    },
    body: JSON.stringify({ weightKg: 50, recordedOn: "2026-09-07" }),
  });
  record(
    "other user cannot update owner's weight",
    404,
    otherUpdatesWeight.status,
  );

  const ownerUpdatesActivity = await request(`/api/activities/${activity.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authorization(owner.token),
    },
    body: JSON.stringify({
      activityType: "hiking",
      name: "Owner updated activity",
      date: "2026-09-07",
      minutes: 45,
      metres: 1500,
      people: ["Authorization Owner"],
    }),
  });
  record("owner updates own activity", 200, ownerUpdatesActivity.status);

  const adminDeletesActivity = await request(`/api/activities/${activity.id}`, {
    method: "DELETE",
    headers: authorization(admin.token),
  });
  record(
    "administrator deletes another user's activity",
    204,
    adminDeletesActivity.status,
  );
  const adminDeletesWeight = await request(`/api/weights/${weight.id}`, {
    method: "DELETE",
    headers: authorization(admin.token),
  });
  record(
    "administrator deletes another user's weight",
    204,
    adminDeletesWeight.status,
  );

  const preservedActivityResponse = await request("/api/activities", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authorization(owner.token),
    },
    body: JSON.stringify({
      activityType: "hiking",
      name: "Activity retained after user deletion",
      date: "2026-09-07",
      minutes: 20,
      metres: 750,
      people: ["Authorization Owner Updated"],
    }),
  });
  const preservedActivity = await json<{ id: string }>(
    preservedActivityResponse,
  );
  record(
    "owner creates activity retained after deletion",
    201,
    preservedActivityResponse.status,
  );
  const ownerAdminListActivityResponse = await request("/api/activities", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authorization(owner.token),
    },
    body: JSON.stringify({
      activityType: "hiking",
      name: "Owner administrator list activity",
      date: "2099-12-31",
      minutes: 35,
      metres: 1200,
      people: ["Authorization Owner"],
    }),
  });
  const ownerAdminListActivity = await json<{ id: string }>(
    ownerAdminListActivityResponse,
  );
  record(
    "owner creates activity for administrator list",
    201,
    ownerAdminListActivityResponse.status,
  );
  const otherAdminListActivityResponse = await request("/api/activities", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authorization(other.token),
    },
    body: JSON.stringify({
      activityType: "fitness",
      name: "Fitness",
      date: "2099-12-31",
      minutes: 40,
      metres: null,
      people: ["Authorization Other"],
    }),
  });
  const otherAdminListActivity = await json<{ id: string }>(
    otherAdminListActivityResponse,
  );
  record(
    "other user creates activity for administrator list",
    201,
    otherAdminListActivityResponse.status,
  );
  const regularUserReadsAllAdminActivities = await request(
    "/api/admin/activities?page=1&pageSize=1",
    { headers: authorization(other.token) },
  );
  record(
    "regular user cannot access all administrator activities",
    403,
    regularUserReadsAllAdminActivities.status,
  );
  const administratorReadsAllActivities = await request(
    "/api/admin/activities?page=1&pageSize=1",
    { headers: authorization(admin.token) },
  );
  record(
    "administrator reads activities from all users",
    200,
    administratorReadsAllActivities.status,
  );
  const allActivityPage = await json<{
    items: { id: string; date: string; author: { id: string; name: string } }[];
    pageSize: number;
    totalActivities: number;
    totalDays: number;
  }>(administratorReadsAllActivities);
  record(
    "administrator activity page paginates by one day",
    1,
    allActivityPage.pageSize,
  );
  record(
    "activities from the same day remain on one administrator page",
    1,
    [ownerAdminListActivity.id, otherAdminListActivity.id].every((id) =>
      allActivityPage.items.some((item) => item.id === id),
    )
      ? 1
      : 0,
  );
  record(
    "administrator activity page contains activity authors",
    1,
    allActivityPage.items.every((item) =>
      Boolean(item.author.id && item.author.name),
    )
      ? 1
      : 0,
  );
  const regularUserReadsAdminActivities = await request(
    `/api/admin/users/${owner.user.id}/activities?page=1&pageSize=10`,
    { headers: authorization(other.token) },
  );
  record(
    "regular user cannot access administrator activity list",
    403,
    regularUserReadsAdminActivities.status,
  );
  const administratorReadsUserActivities = await request(
    `/api/admin/users/${owner.user.id}/activities?page=1&pageSize=10`,
    { headers: authorization(admin.token) },
  );
  record(
    "administrator reads paginated user activities",
    200,
    administratorReadsUserActivities.status,
  );
  const activityPage = await json<{
    items: { id: string }[];
    pageSize: number;
    total: number;
  }>(administratorReadsUserActivities);
  record(
    "administrator activity page uses requested size",
    10,
    activityPage.pageSize,
  );
  record(
    "administrator activity page contains user activity",
    1,
    activityPage.items.some((item) => item.id === preservedActivity.id) ? 1 : 0,
  );
  const adminDeletesUser = await request(`/api/admin/users/${owner.user.id}`, {
    method: "DELETE",
    headers: authorization(admin.token),
  });
  record("administrator deletes another user", 204, adminDeletesUser.status);
  const [retained] = await database.query<{ total: number }[]>(
    "SELECT COUNT(*) AS total FROM activities WHERE id = ?",
    [preservedActivity.id],
  );
  record(
    "deleted user activity remains in database",
    1,
    Number(retained?.total ?? 0),
  );
  const deletedUserLogin = await login("authz.owner.updated@example.test");
  record("deleted user cannot log in", 401, deletedUserLogin.status);

  console.table(results);
  const failed = results.filter((result) => !result.passed);
  console.log(
    `Authorization tests: ${results.length - failed.length}/${results.length} passed`,
  );
  if (failed.length) process.exitCode = 1;
} finally {
  await database.query("DELETE FROM users WHERE id IN (?, ?, ?)", [
    ownerUserId,
    otherUserId,
    adminUserId,
  ]);
  await database.end();
}
