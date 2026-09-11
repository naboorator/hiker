# Automatic production deployment

Every push to the `develop` branch triggers `.github/workflows/deploy-release.yml`.
The workflow verifies and builds both applications, deploys them over SSH, installs
the API production dependencies, and restarts Passenger. The server-side API
`.env` file is never uploaded or overwritten.

## Required GitHub Actions secrets

Configure these under **Repository settings → Secrets and variables → Actions**:

- `DEPLOY_HOST` — SSH hostname of the deployment server.
- `DEPLOY_USER` — SSH account used for deployment.
- `DEPLOY_SSH_KEY` — private SSH key whose public key is authorized on the server.
- `DEPLOY_SSH_KNOWN_HOSTS` — trusted SSH host-key line for the server.
- `FRONTEND_PATH` — absolute document-root path for `hiker.divader.si`.
- `API_PATH` — absolute Passenger application root for `hiker-api.divader.si`.

Generate the known-hosts value on a trusted machine and verify its fingerprint
with the hosting provider before saving it:

```bash
ssh-keyscan -H your-server-hostname
```

The deployed API layout uses `dist/server.js`; Passenger must therefore use
`dist/server.js` as its startup file. Configure the production database and JWT
environment variables in the hosting control panel before the first deploy. The
API does not automatically load a `.env` file.

## Deploying

Push the version that should be deployed to `develop`:

```bash
git switch develop
git push -u origin develop
```
